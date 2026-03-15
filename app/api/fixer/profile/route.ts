import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await pool.query(
      `SELECT v.name, v.email, v.phone, v.availability, v.skills, v.comments, v.is_fixer, v.is_helper
       FROM volunteers v
       WHERE LOWER(v.email) = LOWER($1)`,
      [user.email]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ profile: null }, { status: 200 });
    }

    const row = result.rows[0];
    return NextResponse.json({
      profile: {
        ...row,
        skills: Array.isArray(row.skills) ? row.skills.join(', ') : row.skills || '',
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching profile:', error);
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
    const skills = skillsString ? skillsString.split(',').map(s => s.trim()).filter(Boolean) : [];

    await pool.query("UPDATE users SET name = $1 WHERE id = $2", [name, user.id]);

    await pool.query(
      `UPDATE volunteers SET name = $1, phone = $2, availability = $3, skills = $4, updated_at = NOW()
       WHERE LOWER(email) = LOWER($5)`,
      [name, phone || null, availability || null, skills, user.email]
    );

    return NextResponse.json({ message: 'Profile updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
