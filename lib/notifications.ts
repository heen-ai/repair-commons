import pool from './db';
import { sendEmail } from './email';

export type NotificationType = 'item_in_progress' | 'item_completed';

interface ItemInfo {
  id: string;
  name: string;
  problem: string;
  status: string;
  outcome?: string;
  outcome_notes?: string;
  repair_method?: string;
  parts_used?: string;
}

interface UserInfo {
  id: string;
  email: string;
  name: string;
}

interface EventInfo {
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  venue_name?: string;
}

// Check if user wants notifications for items
async function shouldNotify(userId: string, notificationType: string): Promise<boolean> {
  // For now, default to true if no preferences set
  // In production, would check notification_preferences table
  try {
    const result = await pool.query(
      `SELECT notify_events FROM notification_preferences WHERE user_id = $1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      return true; // Default to notify
    }
    
    return result.rows[0].notify_events !== false;
  } catch (error) {
    return true; // Default to notify on error
  }
}

// Send notification when item status changes
export async function notifyItemStatusChange(
  item: ItemInfo,
  user: UserInfo,
  event: EventInfo,
  oldStatus: string,
  newStatus: string
): Promise<void> {
  // Check if we should notify
  const shouldSend = await shouldNotify(user.id, 'item_status');
  if (!shouldSend) {
    console.log(`[Notifications] User ${user.id} opted out of item notifications`);
    return;
  }

  const eventDate = new Date(event.date).toLocaleDateString('en-CA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (newStatus === 'in-progress') {
    await sendEmail({
      to: user.email,
      subject: `🔧 Your item "${item.name}" is being repaired!`,
      text: `
Hi ${user.name},

Great news! A fixer has started working on your item at the Repair Cafe.

Item: ${item.name}
Problem: ${item.problem}
Event: ${event.title}
Date: ${eventDate}

The fixer will let you know when your item is ready for pickup.

- The London Repair Cafe Team
      `.trim(),
      html: `
<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #15803d;">🔧 Your item is being repaired!</h2>
  <p>Hi ${user.name},</p>
  <p>Great news! A fixer has started working on your item at the Repair Cafe.</p>
  <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p><strong>Item:</strong> ${item.name}</p>
    <p><strong>Problem:</strong> ${item.problem}</p>
    <p><strong>Event:</strong> ${event.title}</p>
    <p><strong>Date:</strong> ${eventDate}</p>
  </div>
  <p>The fixer will let you know when your item is ready for pickup.</p>
  <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
    - The London Repair Cafe Team
  </p>
</div>
      `.trim(),
    });
  } else if (newStatus === 'completed') {
    const outcomeText = getOutcomeText(item.outcome);
    
    await sendEmail({
      to: user.email,
      subject: `✅ Repair complete for "${item.name}" - ${outcomeText}`,
      text: `
Hi ${user.name},

Your item has been repaired! Here's the update:

Item: ${item.name}
Outcome: ${outcomeText}
${item.outcome_notes ? `Notes: ${item.outcome_notes}` : ''}
${item.repair_method ? `Repair method: ${item.repair_method}` : ''}
${item.parts_used ? `Parts used: ${item.parts_used}` : ''}

Event: ${event.title}
Date: ${eventDate}

Please pick up your item at the event. Thank you for participating in the Repair Cafe!

- The London Repair Cafe Team
      `.trim(),
      html: `
<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #15803d;">✅ Repair Complete!</h2>
  <p>Hi ${user.name},</p>
  <p>Your item has been repaired! Here's the update:</p>
  <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p><strong>Item:</strong> ${item.name}</p>
    <p><strong>Outcome:</strong> ${outcomeText}</p>
    ${item.outcome_notes ? `<p><strong>Notes:</strong> ${item.outcome_notes}</p>` : ''}
    ${item.repair_method ? `<p><strong>Repair method:</strong> ${item.repair_method}</p>` : ''}
    ${item.parts_used ? `<p><strong>Parts used:</strong> ${item.parts_used}</p>` : ''}
  </div>
  <p><strong>Event:</strong> ${event.title}</p>
  <p><strong>Date:</strong> ${eventDate}</p>
  <p style="margin-top: 16px;">Please pick up your item at the event. Thank you for participating in the Repair Cafe!</p>
  <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
    - The London Repair Cafe Team
  </p>
</div>
      `.trim(),
    });
  }
}

function getOutcomeText(outcome?: string): string {
  switch (outcome) {
    case 'fixed':
      return 'Fixed!';
    case 'partially_fixed':
      return 'Partially Fixed';
    case 'not_repairable':
      return 'Not Repairable';
    case 'needs_parts':
      return 'Needs Parts';
    default:
      return 'Completed';
  }
}
