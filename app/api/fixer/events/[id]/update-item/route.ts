import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { notifyItemStatusChange } from '@/lib/notifications';

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
    const { itemId, status, outcome, outcome_notes, repair_method, parts_used } = body;

    if (!itemId || !status) {
      return NextResponse.json({ success: false, message: 'Item ID and status required' }, { status: 400 });
    }

    // Get current item status before update
    const currentItem = await pool.query(
      `SELECT i.id, i.status, i.fixer_id, i.user_id, i.name, i.problem, i.outcome, i.outcome_notes,
              r.event_id, r.user_id as item_owner_id,
              e.title as event_title, e.date as event_date, e.start_time, e.end_time,
              v.name as venue_name
       FROM items i
       JOIN registrations r ON i.registration_id = r.id
       JOIN events e ON r.event_id = e.id
       LEFT JOIN venues v ON e.venue_id = v.id
       WHERE i.id = $1 AND r.event_id = $2`,
      [itemId, eventId]
    );

    if (currentItem.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Item not found' }, { status: 404 });
    }

    const item = currentItem.rows[0];
    
    // Only allow fixer who claimed it (or admin) to update
    if (user.role !== 'admin' && item.fixer_id !== user.id) {
      return NextResponse.json({ success: false, message: 'You can only update items you claimed' }, { status: 403 });
    }

    const oldStatus = item.status;

    // Build update query
    let query = 'UPDATE items SET status = $1, updated_at = NOW()';
    const queryParams: any[] = [status, itemId];

    if (status === 'in-progress') {
      query += ', repair_started_at = NOW()';
    } else if (status === 'completed') {
      query += ', repair_completed_at = NOW()';
      // Add outcome fields if provided
      if (outcome !== undefined) {
        query += ', outcome = $3';
        queryParams.push(outcome);
      }
      if (outcome_notes !== undefined) {
        query += ', outcome_notes = $4';
        queryParams.push(outcome_notes);
      }
      if (repair_method !== undefined) {
        query += ', repair_method = $5';
        queryParams.push(repair_method);
      }
      if (parts_used !== undefined) {
        query += ', parts_used = $6';
        queryParams.push(parts_used);
      }
    } else if (status === 'registered') {
      // Reset when putting back in queue
      query += ', fixer_id = NULL, repair_started_at = NULL, repair_completed_at = NULL, outcome = NULL, outcome_notes = NULL';
    }

    query += ' WHERE id = $2';

    await pool.query(query, queryParams);

    // Send notification if status changed to in-progress or completed
    if ((status === 'in-progress' || status === 'completed') && oldStatus !== status) {
      // Get owner info
      const ownerResult = await pool.query(
        'SELECT id, email, name FROM users WHERE id = $1',
        [item.item_owner_id]
      );

      if (ownerResult.rows.length > 0) {
        const owner = ownerResult.rows[0];
        
        // Send async notification (don't wait)
        notifyItemStatusChange(
          {
            id: item.id,
            name: item.name,
            problem: item.problem,
            status: status,
            outcome: outcome,
            outcome_notes: outcome_notes,
            repair_method: repair_method,
            parts_used: parts_used,
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
          status
        ).catch(err => console.error('Failed to send notification:', err));
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Item updated successfully',
    });
  } catch (error) {
    console.error('Error updating item:', error);
    return NextResponse.json({ success: false, message: 'Failed to update item' }, { status: 500 });
  }
}
