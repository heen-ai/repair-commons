import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET /api/admin/events/[id]/stats - get event stats for dashboard
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id: eventId } = await params;

    // Get event info
    const eventResult = await pool.query(
      `SELECT e.id, e.title, e.date, e.start_time, e.end_time, e.status,
              v.name as venue_name, v.address as venue_address
       FROM events e
       LEFT JOIN venues v ON e.venue_id = v.id
       WHERE e.id = $1`,
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Event not found' }, { status: 404 });
    }

    const event = eventResult.rows[0];

    // Get registration stats
    const regStats = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'registered' THEN 1 END) as registered,
        COUNT(CASE WHEN status = 'waitlisted' THEN 1 END) as waitlisted,
        COUNT(CASE WHEN status = 'checked_in' THEN 1 END) as checked_in,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
       FROM registrations 
       WHERE event_id = $1`,
      [eventId]
    );

    // Get item stats (from items table, not registrations)
    const itemStats = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'registered' THEN 1 END) as queued,
        COUNT(CASE WHEN status = 'in-progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
       FROM items 
       WHERE event_id = $1`,
      [eventId]
    );

    // Get outcome stats (from items table)
    const outcomeStats = await pool.query(
      `SELECT 
        COUNT(CASE WHEN outcome = 'fixed' THEN 1 END) as fixed,
        COUNT(CASE WHEN outcome = 'partial_fix' THEN 1 END) as partial_fix,
        COUNT(CASE WHEN outcome = 'not_fixable' THEN 1 END) as not_fixable,
        COUNT(CASE WHEN outcome = 'needs_parts' THEN 1 END) as needs_parts,
        COUNT(CASE WHEN outcome = 'referred' THEN 1 END) as referred
       FROM items 
       WHERE event_id = $1 AND status = 'completed'`,
      [eventId]
    );

    const reg = regStats.rows[0];
    const items = itemStats.rows[0];
    const outcomes = outcomeStats.rows[0];

    // Calculate success rate: (fixed + partial_fix) / total_completed * 100
    const completedCount = parseInt(outcomes.fixed || '0') + 
                          parseInt(outcomes.partial_fix || '0');
    const totalWithOutcome = parseInt(outcomes.fixed || '0') + 
                           parseInt(outcomes.partial_fix || '0') +
                           parseInt(outcomes.not_fixable || '0') +
                           parseInt(outcomes.needs_parts || '0') +
                           parseInt(outcomes.referred || '0');
    
    const success_rate = totalWithOutcome > 0 
      ? Math.round((completedCount / totalWithOutcome) * 100) 
      : 0;

    const registrations = {
      total: parseInt(reg.total || '0'),
      registered: parseInt(reg.registered || '0'),
      waitlisted: parseInt(reg.waitlisted || '0'),
      checked_in: parseInt(reg.checked_in || '0'),
      cancelled: parseInt(reg.cancelled || '0'),
      active: parseInt(reg.registered || '0') - parseInt(reg.cancelled || '0')
    };

    const itemData = {
      total: parseInt(items.total || '0'),
      queued: parseInt(items.queued || '0'),
      in_progress: parseInt(items.in_progress || '0'),
      completed: parseInt(items.completed || '0')
    };

    const outcomeData = {
      fixed: parseInt(outcomes.fixed || '0'),
      partial_fix: parseInt(outcomes.partial_fix || '0'),
      not_fixable: parseInt(outcomes.not_fixable || '0'),
      needs_parts: parseInt(outcomes.needs_parts || '0'),
      referred: parseInt(outcomes.referred || '0')
    };

    return NextResponse.json({
      success: true,
      event,
      registrations,
      items: itemData,
      outcomes: outcomeData,
      success_rate
    });

  } catch (error) {
    console.error('Error fetching event stats:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch stats' }, { status: 500 });
  }
}
