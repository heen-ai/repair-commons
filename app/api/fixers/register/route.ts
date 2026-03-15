import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET /api/fixers/register - get upcoming events for RSVP
export async function GET() {
  try {
    const eventsResult = await pool.query(
      `SELECT e.id, e.title, e.date, v.name as venue_name, v.address as venue_address
       FROM events e
       JOIN venues v ON e.venue_id = v.id
       WHERE e.date > CURRENT_DATE AND e.status != 'cancelled'
       ORDER BY e.date ASC
       LIMIT 10`
    );

    return NextResponse.json({ success: true, events: eventsResult.rows });
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch data' }, { status: 500 });
  }
}

// POST /api/fixers/register - register a new fixer (writes to volunteers table)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, skills, availability, comments, eventRsvps, ageGroup, gender, genderSelfDescribe, newcomer } = body;

    if (!name || !email) {
      return NextResponse.json({ success: false, message: 'Name and email are required' }, { status: 400 });
    }

    // Convert skills string to array
    const skillsArray = skills
      ? skills.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];

    // Check if volunteer already exists
    const existing = await pool.query(
      'SELECT id, is_fixer FROM volunteers WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    let volunteerId;

    if (existing.rows.length > 0) {
      // Update existing - set is_fixer = true
      volunteerId = existing.rows[0].id;
      await pool.query(
        `UPDATE volunteers 
         SET name = $1, phone = $2, skills = $3, availability = $4, comments = $5, is_fixer = true, updated_at = NOW()
         WHERE id = $6`,
        [name, phone || null, skillsArray, availability, comments, volunteerId]
      );
    } else {
      // Create new volunteer with is_fixer = true
      const result = await pool.query(
        `INSERT INTO volunteers (name, email, phone, skills, availability, comments, is_fixer, is_helper, status)
         VALUES ($1, $2, $3, $4, $5, $6, true, false, 'pending') RETURNING id`,
        [name, email.toLowerCase(), phone || null, skillsArray, availability, comments]
      );
      volunteerId = result.rows[0].id;
    }

    // Ensure user exists with fixer role
    const userResult = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    if (userResult.rows.length > 0) {
      await pool.query("UPDATE users SET role = 'fixer' WHERE id = $1 AND role = 'attendee'", [userResult.rows[0].id]);
    }

    // Handle event RSVPs
    if (eventRsvps && eventRsvps.length > 0) {
      for (const rsvp of eventRsvps) {
        if (rsvp.response && rsvp.response !== '') {
          await pool.query(
            `INSERT INTO volunteer_event_rsvps (volunteer_id, event_id, response)
             VALUES ($1, $2, $3)
             ON CONFLICT (volunteer_id, event_id) DO UPDATE SET response = $3`,
            [volunteerId, rsvp.eventId, rsvp.response]
          );
        }
      }
    }

    // Handle demographics (optional)
    if (ageGroup || gender || newcomer) {
      const genderValue = gender === "self_describe" ? genderSelfDescribe : gender;

      const existingDemo = await pool.query(
        "SELECT id FROM registration_demographics WHERE volunteer_id = $1",
        [volunteerId]
      );

      if (existingDemo.rows.length > 0) {
        await pool.query(
          `UPDATE registration_demographics 
           SET age_group = $1, gender = $2, gender_self_describe = $3, newcomer_to_canada = $4
           WHERE id = $5`,
          [ageGroup || null, genderValue || null, gender === "self_describe" ? genderSelfDescribe : null, newcomer || null, existingDemo.rows[0].id]
        );
      } else {
        await pool.query(
          `INSERT INTO registration_demographics (volunteer_id, age_group, gender, gender_self_describe, newcomer_to_canada)
           VALUES ($1, $2, $3, $4, $5)`,
          [volunteerId, ageGroup || null, genderValue || null, gender === "self_describe" ? genderSelfDescribe : null, newcomer || null]
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: existing.rows.length > 0 ? 'Profile updated successfully' : 'Registration successful',
      volunteerId
    });
  } catch (error) {
    console.error('Error registering fixer:', error);
    return NextResponse.json({ success: false, message: 'Registration failed' }, { status: 500 });
  }
}
