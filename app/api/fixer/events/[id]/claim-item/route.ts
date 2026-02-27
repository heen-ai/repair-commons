import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { notifyItemStatusChange } from '@/lib/notifications';

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

    // Verify item belongs to event and get item details for notification
    const itemCheck = await pool.query(
      `SELECT i.id, i.status, i.name, i.problem, i.user_id,
              r.event_id,
              e.title as event_title, e.date as event_date, e.start_time, e.end_time,
              v.name as venue_name
       FROM items i
       JOIN registrations r ON i.registration_id = r.id
       JOIN events e ON r.event_id = e.id
       LEFT JOIN venues v ON e.venue_id = v.id
       WHERE i.id = $1 AND r.event_id = $2`,
      [itemId, eventId]
    );

    if (itemCheck.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Item not found' }, { status: 404 });
    }

    const item = itemCheck.rows[0];

    if (itemCheck.rows[0].status !== 'registered') {
      return NextResponse.json({ success: false, message: 'Item not available' }, { status: 400 });
    }

    const oldStatus = item.status;

    // Claim item
    await pool.query(
      `UPDATE items 
       SET fixer_id = $1, status = 'in-progress', repair_started_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [user.id, itemId]
    );

    // Send notification to owner
    const ownerResult = await pool.query(
      'SELECT id, email, name FROM users WHERE id = $1',
      [item.user_id]
    );

    if (ownerResult.rows.length > 0) {
      const owner = ownerResult.rows[0];
      
      // Send async notification
      notifyItemStatusChange(
        {
          id: item.id,
          name: item.name,
          problem: item.problem,
          status: 'in-progress',
        },
        {
          id: owner.id,
          email: owner.email,
          name: owner.name,
        },
        {
          title: item.event_title,
          date: item.event_date,
          start_time: item.start_time,
          end_time: item.end_time,
          venue_name: item.venue_name,
        },
        oldStatus,
        'in-progress'
      ).catch(err => console.error('Failed to send notification:', err));
    }

    return NextResponse.json({
      success: true,
      message: 'Item claimed successfully',
    });
  } catch (error) {
    console.error('Error claiming item:', error);
    return NextResponse.json({ success: false, message: 'Failed to claim item' }, { status: 500 });
  }
}
