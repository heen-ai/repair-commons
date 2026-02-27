import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// POST /api/fixer/events/[id]/items/[itemId] - log repair outcome
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const user = await requireAuth(request);
    if (!user || !['admin', 'fixer'].includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id: eventId, itemId } = await params;
    const body = await request.json();
    const { outcome, outcome_notes, parts_used } = body;

    if (!outcome) {
      return NextResponse.json({ success: false, message: 'Outcome is required' }, { status: 400 });
    }

    const validOutcomes = ['fixed', 'partial_fix', 'not_fixable', 'needs_parts', 'referred'];
    if (!validOutcomes.includes(outcome)) {
      return NextResponse.json({ success: false, message: 'Invalid outcome' }, { status: 400 });
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
    
    // Only allow fixer who claimed it (or admin) to log outcome
    if (user.role !== 'admin' && item.fixer_id !== user.id) {
      return NextResponse.json({ success: false, message: 'You can only update items you claimed' }, { status: 403 });
    }

    // Update item with outcome
    await pool.query(
      `UPDATE items 
       SET outcome = $1, 
           outcome_notes = $2, 
           parts_used = $3,
           status = 'completed',
           repair_completed_at = NOW(),
           updated_at = NOW()
       WHERE id = $4`,
      [outcome, outcome_notes || null, parts_used || null, itemId]
    );

    return NextResponse.json({
      success: true,
      message: 'Repair outcome logged successfully',
    });
  } catch (error) {
    console.error('Error logging outcome:', error);
    return NextResponse.json({ success: false, message: 'Failed to log outcome' }, { status: 500 });
  }
}

// GET /api/fixer/events/[id]/items/[itemId] - get item details for outcome logging
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const user = await requireAuth(request);
    if (!user || !['admin', 'fixer'].includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id: eventId, itemId } = await params;

    // Get item details
    const result = await pool.query(
      `SELECT 
        i.id, i.name, i.problem, i.status, i.item_type, i.make, i.model,
        i.outcome, i.outcome_notes, i.parts_used,
        i.repair_started_at, i.repair_completed_at,
        u.name as owner_name,
        f.name as fixer_name
       FROM items i
       JOIN registrations r ON i.registration_id = r.id
       JOIN users u ON r.user_id = u.id
       LEFT JOIN users f ON i.fixer_id = f.id
       WHERE i.id = $1 AND r.event_id = $2`,
      [itemId, eventId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      item: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching item:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch item' }, { status: 500 });
  }
}
