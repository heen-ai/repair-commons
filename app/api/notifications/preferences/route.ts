'use server';

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM notification_preferences WHERE user_id = $1',
      [user.id]
    );

    if (result.rows.length === 0) {
      // Return defaults if no preferences set
      return NextResponse.json({
        success: true,
        preferences: {
          notify_comments: true,
          notify_daily_digest: false,
          notify_weekly_digest: false,
          notify_events: true
        }
      });
    }

    return NextResponse.json({ success: true, preferences: result.rows[0] });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch preferences' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { notify_comments, notify_daily_digest, notify_weekly_digest, notify_events } = body;

  try {
    // Upsert preferences
    const result = await pool.query(
      `INSERT INTO notification_preferences (user_id, notify_comments, notify_daily_digest, notify_weekly_digest, notify_events)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET
         notify_comments = COALESCE($2, notification_preferences.notify_comments),
         notify_daily_digest = COALESCE($3, notification_preferences.notify_daily_digest),
         notify_weekly_digest = COALESCE($4, notification_preferences.notify_weekly_digest),
         notify_events = COALESCE($5, notification_preferences.notify_events),
         updated_at = NOW()
       RETURNING *`,
      [user.id, notify_comments, notify_daily_digest, notify_weekly_digest, notify_events]
    );

    return NextResponse.json({ success: true, preferences: result.rows[0] });
  } catch (error) {
    console.error('Error updating preferences:', error);
    return NextResponse.json({ success: false, message: 'Failed to update preferences' }, { status: 500 });
  }
}
