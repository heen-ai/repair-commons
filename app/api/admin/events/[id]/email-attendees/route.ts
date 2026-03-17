import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

interface EmailRequestBody {
  subject: string;
  message: string;
  include_waitlist?: boolean;
}

// POST /api/admin/events/[id]/email-attendees - send bulk email to attendees
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id: eventId } = await params;

    // Parse body
    let body: EmailRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 });
    }

    const { subject, message, include_waitlist = false } = body;

    if (!subject || !message) {
      return NextResponse.json({ success: false, message: 'Subject and message are required' }, { status: 400 });
    }

    // Get event info for the email
    const eventResult = await pool.query(
      `SELECT e.title, e.date, e.start_time, v.name as venue_name
       FROM events e
       LEFT JOIN venues v ON e.venue_id = v.id
       WHERE e.id = $1`,
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Event not found' }, { status: 404 });
    }

    const event = eventResult.rows[0];

    // Get registrant emails
    let query = `
      SELECT DISTINCT r.email, r.name
      FROM registrations r
      WHERE r.event_id = $1 AND r.status = 'registered'
    `;
    const queryParams: (string | number)[] = [eventId];

    if (include_waitlist) {
      query = `
        SELECT DISTINCT r.email, r.name
        FROM registrations r
        WHERE r.event_id = $1 AND r.status IN ('registered', 'waitlisted')
      `;
    }

    const result = await pool.query(query, queryParams);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'No recipients found' });
    }

    // Send emails
    let sent = 0;
    const eventDate = new Date(event.date).toLocaleDateString('en-CA', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    for (const recipient of result.rows) {
      const html = `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #15803d; margin-bottom: 8px;">London Repair Café</h2>
          <p style="font-size: 16px;">Hi ${recipient.name || 'there'},</p>
          <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <h3 style="margin: 0 0 12px 0; color: #374151; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Event</h3>
            <p style="margin: 4px 0;"><strong>${event.title}</strong></p>
            <p style="margin: 4px 0;"><strong>Date:</strong> ${eventDate}</p>
            ${event.start_time ? `<p style="margin: 4px 0;"><strong>Time:</strong> ${event.start_time}</p>` : ''}
            ${event.venue_name ? `<p style="margin: 4px 0;"><strong>Venue:</strong> ${event.venue_name}</p>` : ''}
          </div>
          <div style="margin: 20px 0;">
            ${message.replace(/\n/g, '<br>')}
          </div>
          <p style="color: #666; font-size: 14px; margin-top: 24px;">
            - The London Repair Café Team
          </p>
        </div>
      `;

      const text = `Hi ${recipient.name || 'there'},

${message}

- The London Repair Café Team`;

      const success = await sendEmail({
        to: recipient.email,
        subject: subject,
        text,
        html,
      });

      if (success) {
        sent++;
      }
    }

    return NextResponse.json({
      success: true,
      sent
    });

  } catch (error) {
    console.error('Error sending bulk email:', error);
    return NextResponse.json({ success: false, message: 'Failed to send emails' }, { status: 500 });
  }
}
