import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// POST /api/fixer/events/[id]/claim-item - claim an item for repair
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
    const { itemId } = body;

    if (!itemId) {
      return NextResponse.json({ success: false, message: 'Item ID required' }, { status: 400 });
    }

    // Verify item belongs to event
    const itemCheck = await pool.query(
      `SELECT i.id, i.status, r.event_id 
       FROM items i
       JOIN registrations r ON i.registration_id = r.id
       WHERE i.id = $1 AND r.event_id = $2`,
      [itemId, eventId]
    );

    if (itemCheck.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Item not found' }, { status: 404 });
    }

    if (itemCheck.rows[0].status !== 'registered') {
      return NextResponse.json({ success: false, message: 'Item not available' }, { status: 400 });
    }

    // Claim item
    await pool.query(
      `UPDATE items 
       SET fixer_id = $1, status = 'in-progress', repair_started_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [user.id, itemId]
    );

    return NextResponse.json({
      success: true,
      message: 'Item claimed successfully',
    });
  } catch (error) {
    console.error('Error claiming item:', error);
    return NextResponse.json({ success: false, message: 'Failed to claim item' }, { status: 500 });
  }
}
