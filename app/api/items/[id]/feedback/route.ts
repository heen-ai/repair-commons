import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// POST: Submit feedback for an item
export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { itemId, rating, comment } = body;

  if (!itemId || !rating) {
    return NextResponse.json({ success: false, message: 'Item ID and rating required' }, { status: 400 });
  }

  if (rating < 1 || rating > 5) {
    return NextResponse.json({ success: false, message: 'Rating must be between 1 and 5' }, { status: 400 });
  }

  try {
    // Verify the item belongs to this user
    const itemResult = await pool.query(
      'SELECT id, user_id FROM items WHERE id = $1',
      [itemId]
    );

    if (itemResult.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Item not found' }, { status: 404 });
    }

    if (itemResult.rows[0].user_id !== user.id) {
      return NextResponse.json({ success: false, message: 'Not authorized' }, { status: 403 });
    }

    // Insert or update feedback
    const result = await pool.query(
      `INSERT INTO item_feedback (item_id, user_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (item_id, user_id) DO UPDATE SET
         rating = $3,
         comment = $4,
         created_at = NOW()
       RETURNING *`,
      [itemId, user.id, rating, comment || '']
    );

    return NextResponse.json({ success: true, feedback: result.rows[0] });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return NextResponse.json({ success: false, message: 'Failed to submit feedback' }, { status: 500 });
  }
}

// GET: Get feedback for an item
export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get('itemId');

  if (!itemId) {
    return NextResponse.json({ success: false, message: 'Item ID required' }, { status: 400 });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM item_feedback WHERE item_id =_id = $2',
      [item $1 AND userId, user.id]
    );

    return NextResponse.json({ success: true, feedback: result.rows[0] || null });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch feedback' }, { status: 500 });
  }
}
