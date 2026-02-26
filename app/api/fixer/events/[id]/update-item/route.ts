import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// POST /api/fixer/events/[id]/update-item - update item status
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    if (!user || !['admin', 'fixer'].includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id: eventId } = await params;
    const body = await request.json();
    const { itemId, status } = body;

    if (!itemId || !status) {
      return NextResponse.json({ success: false, message: 'Item ID and status required' }, { status: 400 });
    }

    // Verify item belongs to event and user is the fixer (or admin)
    const itemCheck = await pool.query(
      `SELECT i.id, i.fixer_id, r.event_id 
       FROM items i
       JOIN registrations r ON i.registration_id = r.id
       WHERE i.id = $1 AND r.event_id = $2`,
      [itemId, eventId]
    );

    if (itemCheck.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Item not found' }, { status: 404 });
    }

    const item = itemCheck.rows[0];
    
    // Only allow fixer who claimed it (or admin) to update
    if (user.role !== 'admin' && item.fixer_id !== user.id) {
      return NextResponse.json({ success: false, message: 'You can only update items you claimed' }, { status: 403 });
    }

    // Build update query
    let query = 'UPDATE items SET status = $1, updated_at = NOW()';
    const queryParams: any[] = [status, itemId];

    if (status === 'in-progress') {
      query += ', repair_started_at = NOW()';
    } else if (status === 'completed') {
      query += ', repair_completed_at = NOW()';
    } else if (status === 'registered') {
      // Reset when putting back in queue
      query += ', fixer_id = NULL, repair_started_at = NULL, repair_completed_at = NULL';
    }

    query += ' WHERE id = $2';

    await pool.query(query, queryParams);

    return NextResponse.json({
      success: true,
      message: 'Item updated successfully',
    });
  } catch (error) {
    console.error('Error updating item:', error);
    return NextResponse.json({ success: false, message: 'Failed to update item' }, { status: 500 });
  }
}
