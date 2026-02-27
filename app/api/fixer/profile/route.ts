import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET: Get fixer profile with skills and stats
export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if user is a fixer (has fixer profile)
    let fixer = null;
    let userSkills: any[] = [];
    let stats = {
      totalRepairs: 0,
      fixedItems: 0,
      partiallyFixed: 0,
      notRepairable: 0,
    };

    const fixerResult = await pool.query(
      'SELECT * FROM fixers WHERE email = $1',
      [user.email]
    );

    if (fixerResult.rows.length > 0) {
      fixer = fixerResult.rows[0];

      // Get user's skills
      const skillsResult = await pool.query(
        `SELECT s.id, s.name, s.category, s.description, us.self_rated
         FROM skills s
         JOIN user_skills us ON us.skill_id = s.id
         WHERE us.user_id = $1`,
        [user.id]
      );
      userSkills = skillsResult.rows;

      // Get repair stats
      const statsResult = await pool.query(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN outcome = 'fixed' THEN 1 END) as fixed,
          COUNT(CASE WHEN outcome = 'partially_fixed' THEN 1 END) as partially_fixed,
          COUNT(CASE WHEN outcome = 'not_repairable' THEN 1 END) as not_repairable
         FROM items
         WHERE fixer_id = $1`,
        [user.id]
      );

      if (statsResult.rows.length > 0) {
        stats = {
          totalRepairs: parseInt(statsResult.rows[0].total) || 0,
          fixedItems: parseInt(statsResult.rows[0].fixed) || 0,
          partiallyFixed: parseInt(statsResult.rows[0].partially_fixed) || 0,
          notRepairable: parseInt(statsResult.rows[0].not_repairable) || 0,
        };
      }
    }

    // Get all available skills
    const allSkillsResult = await pool.query(
      'SELECT * FROM skills ORDER BY category, name'
    );

    // Get recent repair history
    const historyResult = await pool.query(
      `SELECT i.name, i.problem, i.outcome, i.outcome_notes, i.repair_completed_at,
              e.title as event_title, e.date as event_date
       FROM items i
       JOIN events e ON i.event_id = e.id
       WHERE i.fixer_id = $1 AND i.status = 'completed'
       ORDER BY i.repair_completed_at DESC
       LIMIT 10`,
      [user.id]
    );

    return NextResponse.json({
      success: true,
      fixer,
      userSkills,
      allSkills: allSkillsResult.rows,
      stats,
      recentRepairs: historyResult.rows,
    });
  } catch (error) {
    console.error('Error fetching fixer profile:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch profile' }, { status: 500 });
  }
}

// PATCH: Update fixer profile
export async function PATCH(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, phone, bio, photo_url, skills } = body;

  try {
    // Check if fixer exists
    const existingFixer = await pool.query(
      'SELECT id FROM fixers WHERE email = $1',
      [user.email]
    );

    let fixer;

    if (existingFixer.rows.length > 0) {
      // Update existing fixer
      const result = await pool.query(
        `UPDATE fixers 
         SET name = COALESCE($1, name), 
             phone = COALESCE($2, phone),
             skills = COALESCE($3, skills),
             availability = COALESCE($4, availability),
             comments = COALESCE($5, comments),
             photo_url = COALESCE($6, photo_url),
             updated_at = NOW()
         WHERE email = $7
         RETURNING *`,
        [name, phone, skills, body.availability, body.comments, photo_url, user.email]
      );
      fixer = result.rows[0];
    } else {
      // Create new fixer profile
      const result = await pool.query(
        `INSERT INTO fixers (name, email, phone, skills, photo_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [name || user.name, user.email, phone, skills || '', photo_url]
      );
      fixer = result.rows[0];
    }

    // Update user skills if provided
    if (skills && Array.isArray(skills)) {
      // Remove existing skills
      await pool.query('DELETE FROM user_skills WHERE user_id = $1', [user.id]);

      // Add new skills
      for (const skillId of skills) {
        await pool.query(
          'INSERT INTO user_skills (user_id, skill_id, self_rated) VALUES ($1, $2, true) ON CONFLICT DO NOTHING',
          [user.id, skillId]
        );
      }
    }

    return NextResponse.json({ success: true, fixer });
  } catch (error) {
    console.error('Error updating fixer profile:', error);
    return NextResponse.json({ success: false, message: 'Failed to update profile' }, { status: 500 });
  }
}
