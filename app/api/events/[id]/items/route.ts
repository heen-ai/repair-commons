'use server';

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  
  const user = await requireAuth(request);
  if (!user) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const skillFilter = searchParams.get('skill');
  const typeFilter = searchParams.get('type');

  try {
    // First check if user is a fixer
    const fixerCheck = await pool.query(
      'SELECT * FROM fixers WHERE user_id = $1',
      [user.id]
    );
    
    const isFixer = fixerCheck.rows.length > 0;
    let userSkills: string[] = [];
    
    if (isFixer) {
      // Get user's skills
      const userSkillsResult = await pool.query(
        `SELECT s.name, s.category 
         FROM user_skills us 
         JOIN skills s ON us.skill_id = s.id 
         WHERE us.user_id = $1`,
        [user.id]
      );
      userSkills = userSkillsResult.rows.map(r => r.name);
    }

    // Build query with optional filters
    let query = `
      SELECT 
        i.*,
        u.name as owner_name,
        (SELECT COUNT(*) FROM item_comments WHERE item_id = i.id) as comment_count,
        (SELECT COUNT(*) FROM fixer_interest WHERE item_id = i.id) as interest_count,
        EXISTS(SELECT 1 FROM fixer_interest WHERE item_id = i.id AND fixer_id = $1) as user_interested,
        (
          SELECT json_agg(json_build_object('id', fi.id, 'fixer_name', fu.name, 'notes', fi.notes))
          FROM fixer_interest fi
          JOIN users fu ON fi.fixer_id = fu.id
          WHERE fi.item_id = i.id
        ) as interested_fixers
      FROM items i
      JOIN users u ON i.user_id = u.id
      WHERE i.event_id = $2
    `;

    const queryParams: any[] = [user.id, eventId];
    let paramIndex = 3;

    if (skillFilter) {
      query += ` AND ($3 = ANY(ai_suggested_skills) OR i.item_type ILIKE $4)`;
      queryParams.push(skillFilter);
      queryParams.push(`%${skillFilter}%`);
      paramIndex += 2;
    }

    if (typeFilter) {
      query += ` AND i.item_type ILIKE $${paramIndex}`;
      queryParams.push(`%${typeFilter}%`);
      paramIndex += 1;
    }

    query += ` ORDER BY 
        CASE 
          WHEN $3 = ANY(ai_suggested_skills) THEN 0
          ELSE 1
        END,
        i.priority DESC, 
        i.created_at DESC`;

    // Add skill match for ordering
    if (isFixer && userSkills.length > 0) {
      // This is handled in the ORDER BY above
    }

    const result = await pool.query(query, queryParams);

    // Group items by skill match for priority
    const items = result.rows.map(item => ({
      ...item,
      skill_match: isFixer && item.ai_suggested_skills 
        ? item.ai_suggested_skills.some((s: string) => userSkills.includes(s))
        : false
    }));

    // Sort to prioritize skill matches at the top
    items.sort((a, b) => {
      if (a.skill_match && !b.skill_match) return -1;
      if (!a.skill_match && b.skill_match) return 1;
      return 0;
    });

    // Get available filters
    const skillsResult = await pool.query(`
      SELECT DISTINCT category FROM skills ORDER BY category
    `);
    const typesResult = await pool.query(`
      SELECT DISTINCT item_type FROM items WHERE event_id = $1 AND item_type IS NOT NULL ORDER BY item_type
    `, [eventId]);

    return NextResponse.json({ 
      success: true, 
      items,
      isFixer,
      userSkills,
      filters: {
        skills: skillsResult.rows.map(r => r.category),
        types: typesResult.rows.map(r => r.item_type)
      }
    });
  } catch (error) {
    console.error('Error fetching event items:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch items' }, { status: 500 });
  }
}
