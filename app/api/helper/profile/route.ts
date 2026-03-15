import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  const user = await requireAuth(request);

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Helpers can be volunteers (any role can be a helper)
  try {
    const result = await pool.query(
      `SELECT h.name, u.email, h.phone, h.availability, h.skills, h.skills, h.has_volunteered_before, h.registration_status
       FROM volunteers h
       JOIN users u ON h.user_id = u.id
       WHERE h.user_id = $1`,
      [user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ profile: null }, { status: 200 });
    }

    const profile = result.rows[0];
    return NextResponse.json({ profile }, { status: 200 });
  } catch (error) {
    console.error('Error fetching helper profile:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = await requireAuth(request);

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string | undefined;
    const availability = formData.get('availability') as string | undefined;
    const skillsString = formData.get('skills') as string | undefined;
    const has_volunteered_before = formData.get('has_volunteered_before') === 'on';

    const skills = skillsString ? skillsString.split(',').map(s => s.trim()).filter(s => s.length > 0) : [];

    // Update the users table for name
    await pool.query(
      `UPDATE users SET name = $1 WHERE id = $2`,
      [name, user.id]
    );

    // Update or insert into the volunteers table
    const existingHelper = await pool.query(
      `SELECT id FROM volunteers WHERE user_id = $1`,
      [user.id]
    );

    if (existingHelper.rows.length > 0) {
      // Update existing helper profile
      await pool.query(
        `UPDATE volunteers
         SET name = $1, phone = $2, availability = $3, skills = $4, skills = $5, has_volunteered_before = $6
         WHERE user_id = $7`,
        [name, phone || null, availability || null, skills, skills, has_volunteered_before, user.id]
      );
    } else {
      // Insert new helper profile
      await pool.query(
        `INSERT INTO volunteers (user_id, name, email, phone, availability, skills, skills, has_volunteered_before)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [user.id, name, user.email, phone || null, availability || null, skills, skills, has_volunteered_before]
      );
    }

    return NextResponse.json({ message: 'Profile updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error updating helper profile:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
