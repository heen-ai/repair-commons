import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// POST /api/fixers/register - register a new fixer (public)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, skills, availability, comments, eventRsvps } = body;

    if (!name || !email || !phone) {
      return NextResponse.json(
        { success: false, message: 'Name, email, and phone are required' },
        { status: 400 }
      );
    }

    // Check if fixer already exists
    const existingFixer = await pool.query(
      'SELECT id FROM fixers WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    let fixerId;

    if (existingFixer.rows.length > 0) {
      // Update existing fixer
      fixerId = existingFixer.rows[0].id;
      await pool.query(
        `UPDATE fixers 
         SET name = $1, phone = $2, skills = $3, availability = $4, comments = $5, updated_at = NOW()
         WHERE id = $6`,
        [name, phone, skills, availability, comments, fixerId]
      );
    } else {
      // Create new fixer
      const result = await pool.query(
        `INSERT INTO fixers (name, email, phone, skills, availability, comments)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [name, email.toLowerCase(), phone, skills, availability, comments]
      );
      fixerId = result.rows[0].id;
    }

    // Handle event RSVPs
    if (eventRsvps && eventRsvps.length > 0) {
      // Clear existing RSVPs for this fixer
      await pool.query('DELETE FROM fixer_event_rsvps WHERE fixer_id = $1', [fixerId]);

      // Insert new RSVPs
      for (const rsvp of eventRsvps) {
        await pool.query(
          `INSERT INTO fixer_event_rsvps (fixer_id, event_id, response)
           VALUES ($1, $2, $3)`,
          [fixerId, rsvp.eventId, rsvp.response]
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: existingFixer.rows.length > 0 ? 'Profile updated successfully' : 'Registration successful',
      fixerId
    });
  } catch (error) {
    console.error('Error registering fixer:', error);
    return NextResponse.json(
      { success: false, message: 'Registration failed' },
      { status: 500 }
    );
  }
}

// GET /api/fixers/register - get upcoming events for RSVP
export async function GET() {
  try {
    const result = await pool.query(
      `SELECT id, title, event_date, venue_name, venue_address
       FROM events 
       WHERE event_date > NOW() AND status != 'cancelled'
       ORDER BY event_date ASC
       LIMIT 10`
    );

    return NextResponse.json({ success: true, events: result.rows });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
