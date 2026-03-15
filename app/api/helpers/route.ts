import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

async function sendConfirmationEmail(email: string, name: string) {
  if (!process.env.SMTP_PASS || process.env.SMTP_PASS === "password") {
    console.log(`[DEV] Confirmation email for ${email}: would send here`);
    return;
  }
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM || `"London Repair Café" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Thanks for registering with London Repair Café!",
    text: `Hi ${name},\n\nThanks for registering with London Repair Café!\n\nWe'll be in touch soon with more details about upcoming events.\n\n- The London Repair Café Team`,
    html: `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;"><h2 style="color: #15803d;">London Repair Café</h2><p>Hi ${name},</p><p>Thanks for registering with London Repair Café!</p><p>We'll be in touch soon with more details about upcoming events.</p><p style="color: #666; font-size: 14px; margin-top: 24px;">- The London Repair Café Team</p></div>`,
  });
}

// GET /api/helpers - get upcoming events for RSVP (public) or all volunteers (admin)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // If admin=true, return all volunteers
  if (searchParams.get("admin") === "true") {
    const result = await pool.query(`SELECT * FROM volunteers ORDER BY created_at DESC`);
    return NextResponse.json({ success: true, volunteers: result.rows });
  }
  
  // Otherwise, return upcoming events for RSVP
  try {
    const eventsResult = await pool.query(
      `SELECT e.id, e.title, e.date, v.name as venue_name, v.address as venue_address
       FROM events e
       JOIN venues v ON e.venue_id = v.id
       WHERE e.date > CURRENT_DATE AND e.status != 'cancelled'
       ORDER BY e.date ASC
       LIMIT 10`
    );

    return NextResponse.json({ 
      success: true, 
      events: eventsResult.rows
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

// POST /api/helpers - register a new volunteer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, availability, comments, hasVolunteeredBefore, skills, roles, eventRsvps, ageGroup, gender, genderSelfDescribe, newcomer } = body;

    if (!name || !email) {
      return NextResponse.json(
        { success: false, message: "Name and email are required" },
        { status: 400 }
      );
    }

    // Convert skills string to array if needed
    const skillsArray = Array.isArray(skills) ? skills : (skills ? [skills] : []);
    
    // Check if volunteer already exists
    const existingVolunteer = await pool.query(
      'SELECT id FROM volunteers WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    let volunteerId;

    if (existingVolunteer.rows.length > 0) {
      // Update existing volunteer
      volunteerId = existingVolunteer.rows[0].id;
      await pool.query(
        `UPDATE volunteers 
         SET name = $1, phone = $2, availability = $3, comments = $4, has_volunteered_before = $5, skills = $6, roles = $7, updated_at = NOW()
         WHERE id = $8`,
        [name, phone || null, availability || null, comments || null, hasVolunteeredBefore || false, skillsArray, roles || [], volunteerId]
      );
    } else {
      // Create new volunteer
      const result = await pool.query(
        `INSERT INTO volunteers (name, email, phone, availability, comments, has_volunteered_before, skills, roles, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending') RETURNING id`,
        [name, email.toLowerCase(), phone || null, availability || null, comments || null, hasVolunteeredBefore || false, skillsArray, roles || []]
      );
      volunteerId = result.rows[0].id;
    }

    // Send confirmation email
    try { await sendConfirmationEmail(email, name); } catch (e) { console.error("Email failed:", e); }

    // Handle event RSVPs
    if (eventRsvps && eventRsvps.length > 0) {
      // Clear existing RSVPs for this volunteer
      await pool.query('DELETE FROM volunteer_event_rsvps WHERE volunteer_id = $1', [volunteerId]);

      // Insert new RSVPs
      for (const rsvp of eventRsvps) {
        await pool.query(
          `INSERT INTO volunteer_event_rsvps (volunteer_id, event_id, response)
           VALUES ($1, $2, $3)`,
          [volunteerId, rsvp.eventId, rsvp.response]
        );
      }
    }

    // Handle demographics (optional)
    if (ageGroup || gender || newcomer) {
      // Check if demographics already exist
      const existingDemo = await pool.query(
        "SELECT id FROM registration_demographics WHERE volunteer_id = $1",
        [volunteerId]
      );

      const genderValue = gender === "self_describe" ? genderSelfDescribe : gender;

      if (existingDemo.rows.length > 0) {
        // Update existing
        await pool.query(
          `UPDATE registration_demographics 
           SET age_group = $1, gender = $2, gender_self_describe = $3, newcomer_to_canada = $4
           WHERE id = $5`,
          [ageGroup || null, genderValue || null, gender === "self_describe" ? genderSelfDescribe : null, newcomer || null, existingDemo.rows[0].id]
        );
      } else {
        // Insert new
        await pool.query(
          `INSERT INTO registration_demographics 
           (volunteer_id, age_group, gender, gender_self_describe, newcomer_to_canada)
           VALUES ($1, $2, $3, $4, $5)`,
          [volunteerId, ageGroup || null, genderValue || null, gender === "self_describe" ? genderSelfDescribe : null, newcomer || null]
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: existingVolunteer.rows.length > 0 ? "Profile updated successfully!" : "Registration submitted successfully! We'll be in touch soon.",
      volunteerId
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ success: false, message: "Failed to submit registration" }, { status: 500 });
  }
}
