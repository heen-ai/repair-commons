import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET /api/fixers/register - get upcoming events for RSVP and available skills
export async function GET() {
  try {
    const [eventsResult, skillsResult] = await Promise.all([
      pool.query(
        `SELECT e.id, e.title, e.date, v.name as venue_name, v.address as venue_address
         FROM events e
         JOIN venues v ON e.venue_id = v.id
         WHERE e.date > CURRENT_DATE AND e.status != 'cancelled'
         ORDER BY e.date ASC
         LIMIT 10`
      ),
      pool.query(
        `SELECT id, name, category, description FROM skills ORDER BY category, name`
      )
    ]);

    return NextResponse.json({ 
      success: true, 
      events: eventsResult.rows,
      skills: skillsResult.rows
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

// POST /api/fixers/register - register a new fixer (public)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, skillIds, skills, availability, comments, eventRsvps } = body;

    if (!name || !email) {
      return NextResponse.json(
        { success: false, message: 'Name and email are required' },
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

    // Get or create user and link skills
    const userResult = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    
    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].id;
      
      // Clear existing user skills and add selected ones
      if (skillIds && skillIds.length > 0) {
        await pool.query('DELETE FROM user_skills WHERE user_id = $1', [userId]);
        
        for (const skillId of skillIds) {
          await pool.query(
            'INSERT INTO user_skills (user_id, skill_id) VALUES ($1, $2)',
            [userId, skillId]
          );
        }
      }
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
