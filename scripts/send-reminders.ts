/**
 * Send Reminder Emails Script
 * 
 * Queries events happening in 7 days or 1 day and sends reminder emails
 * to all registered (non-cancelled) attendees.
 * 
 * Usage: npx tsx scripts/send-reminders.ts
 * 
 * Cron setup (optional):
 * 0 9 * * * cd /path/to/revive-commons && npx tsx scripts/send-reminders.ts >> logs/reminders.log 2>&1
 */

import pool from "../lib/db";
import { sendEmail } from "../lib/email";

const BATCH_SIZE = 50;

interface EventInfo {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  venue_name: string | null;
  venue_address: string | null;
  venue_city: string | null;
}

interface RegistrationWithUser {
  registration_id: string;
  user_email: string;
  user_name: string;
  items: string[];
}

async function getUpcomingEvents(): Promise<EventInfo[]> {
  const result = await pool.query(
    `SELECT e.id, e.title, e.date, e.start_time, e.end_time, 
            v.name as venue_name, v.address as venue_address, v.city as venue_city
     FROM events e
     LEFT JOIN venues v ON e.venue_id = v.id
     WHERE e.date::date IN (CURRENT_DATE + INTERVAL '7 days', CURRENT_DATE + INTERVAL '1 day')
       AND e.published = true
     ORDER BY e.date`,
  );
  return result.rows;
}

async function getRegistrationsForEvent(eventId: string): Promise<RegistrationWithUser[]> {
  const result = await pool.query(
    `SELECT r.id as registration_id, u.email as user_email, u.name as user_name,
            COALESCE(json_agg(i.name) FILTER (WHERE i.name IS NOT NULL), '[]') as items
     FROM registrations r
     JOIN users u ON r.user_id = u.id
     LEFT JOIN items i ON i.registration_id = r.id
     WHERE r.event_id = $1 AND r.status != 'cancelled'
     GROUP BY r.id, u.email, u.name`,
    [eventId],
  );
  return result.rows;
}

async function sendReminderEmail(
  email: string,
  name: string,
  event: EventInfo,
  items: string[]
): Promise<boolean> {
  const eventDate = new Date(event.date).toLocaleDateString("en-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const eventTime = `${event.start_time} - ${event.end_time}`;
  const venueAddress = [event.venue_address, event.venue_city]
    .filter(Boolean)
    .join(", ");

  const itemsList = items.length > 0
    ? items.map(item => `• ${item}`).join("\n")
    : "• No items registered";

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueAddress)}`;
  const daysUntil = Math.ceil((new Date(event.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const dayText = daysUntil === 1 ? "tomorrow" : `in ${daysUntil} days`;

  const subject = `Reminder: ${event.title} is ${dayText}!`;

  const text = `Hi ${name},

This is a friendly reminder that ${event.title} is happening ${dayText}!

EVENT DETAILS:
Date: ${eventDate}
Time: ${eventTime}
Venue: ${event.venue_name || "TBD"}
Address: ${venueAddress || "TBD"}

YOUR ITEMS:
${itemsList}

VENUE DIRECTIONS:
${googleMapsUrl}

We look forward to seeing you there!

- The Repair Commons Team`;

  const html = `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #15803d; margin-bottom: 8px;">Repair Commons</h2>
      <p style="font-size: 16px;">Hi ${name},</p>
      <p style="font-size: 16px;">
        This is a friendly reminder that <strong>${event.title}</strong> is happening ${dayText}!
      </p>
      
      <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <h3 style="margin: 0 0 12px 0; color: #374151; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Event Details</h3>
        <p style="margin: 4px 0;"><strong>Date:</strong> ${eventDate}</p>
        <p style="margin: 4px 0;"><strong>Time:</strong> ${eventTime}</p>
        <p style="margin: 4px 0;"><strong>Venue:</strong> ${event.venue_name || "TBD"}</p>
        <p style="margin: 4px 0;"><strong>Address:</strong> ${venueAddress || "TBD"}</p>
      </div>
      
      <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <h3 style="margin: 0 0 12px 0; color: #374151; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Your Items</h3>
        <ul style="margin: 0; padding-left: 20px;">
          ${items.length > 0 
            ? items.map(item => `<li style="margin: 4px 0;">${item}</li>`).join("")
            : "<li>No items registered</li>"}
        </ul>
      </div>
      
      <a href="${googleMapsUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 8px 0;">
        Get Directions
      </a>
      
      <p style="color: #666; font-size: 14px; margin-top: 24px;">
        We look forward to seeing you there!<br/>
        - The Repair Commons Team
      </p>
    </div>
  `;

  return sendEmail({ to: email, subject, text, html });
}

async function main() {
  console.log("🔔 Starting reminder email script...");
  console.log(`📅 Running at: ${new Date().toISOString()}`);

  // Check SMTP configuration
  if (!process.env.SMTP_PASS || process.env.SMTP_PASS === "password") {
    console.log("⚠️  WARNING: SMTP not configured. Emails will only be logged in dev mode.");
  }

  const events = await getUpcomingEvents();

  if (events.length === 0) {
    console.log("📭 No events found happening in 7 days or 1 day.");
    return;
  }

  console.log(`📋 Found ${events.length} event(s) needing reminders.`);

  let totalEmailsSent = 0;
  let totalEmailsFailed = 0;

  for (const event of events) {
    const daysUntil = Math.ceil(
      (new Date(event.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    const dayText = daysUntil === 1 ? "1 day" : "7 days";

    console.log(`\n📅 Processing: ${event.title} (in ${dayText})`);

    const registrations = await getRegistrationsForEvent(event.id);
    console.log(`👥 Found ${registrations.length} registered attendees.`);

    for (const reg of registrations) {
      const items = Array.isArray(reg.items) ? reg.items : [];
      
      try {
        const success = await sendReminderEmail(
          reg.user_email,
          reg.user_name,
          event,
          items
        );

        if (success) {
          console.log(`  ✅ Sent to: ${reg.user_email}`);
          totalEmailsSent++;
        } else {
          console.log(`  ❌ Failed: ${reg.user_email}`);
          totalEmailsFailed++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`  ❌ Error sending to ${reg.user_email}:`, error);
        totalEmailsFailed++;
      }

      // Batch processing delay
      if (totalEmailsSent % BATCH_SIZE === 0) {
        console.log(`📬 Processed ${totalEmailsSent} emails, pausing briefly...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  console.log("\n✅ Reminder email script complete!");
  console.log(`📊 Summary: ${totalEmailsSent} sent, ${totalEmailsFailed} failed.`);
}

main().catch(console.error);
