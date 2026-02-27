import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET: Get all items for the current user across all events
export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all items for this user with event info
    const itemsResult = await pool.query(
      `SELECT 
        i.id, i.name, i.problem, i.status, i.outcome, i.outcome_notes,
        i.queue_position, i.repair_started_at, i.repair_completed_at,
        i.repair_notes, i.repair_method, i.parts_used,
        e.id as event_id, e.title as event_title, e.date as event_date,
        e.start_time, e.end_time,
        v.name as venue_name, v.address as venue_address, v.city as venue_city,
        u.name as fixer_name,
        (SELECT json_agg(rating) FROM item_feedback WHERE item_id = i.id) as ratings
       FROM items i
       JOIN events e ON i.event_id = e.id
       LEFT JOIN venues v ON e.venue_id = v.id
       LEFT JOIN users u ON i.fixer_id = u.id
       WHERE i.user_id = $1
       ORDER BY e.date DESC, i.created_at DESC`,
      [user.id]
    );

    const items = itemsResult.rows;

    // Calculate stats
    const stats = {
      total: items.length,
      registered: items.filter(i => i.status === 'registered').length,
      inProgress: items.filter(i => i.status === 'in-progress').length,
      completed: items.filter(i => i.status === 'completed').length,
      fixed: items.filter(i => i.outcome === 'fixed').length,
      partiallyFixed: items.filter(i => i.outcome === 'partially_fixed').length,
      notRepairable: items.filter(i => i.outcome === 'not_repairable').length,
    };

    // Group by event
    const itemsByEvent = items.reduce((acc: Record<string, any>, item) => {
      const eventKey = item.event_id;
      if (!acc[eventKey]) {
        acc[eventKey] = {
          event_id: item.event_id,
          event_title: item.event_title,
          event_date: item.event_date,
          start_time: item.start_time,
          end_time: item.end_time,
          venue_name: item.venue_name,
          venue_address: item.venue_address,
          venue_city: item.venue_city,
          items: [],
        };
      }
      acc[eventKey].items.push({
        id: item.id,
        name: item.name,
        problem: item.problem,
        status: item.status,
        outcome: item.outcome,
        outcome_notes: item.outcome_notes,
        queue_position: item.queue_position,
        repair_started_at: item.repair_started_at,
        repair_completed_at: item.repair_completed_at,
        repair_notes: item.repair_notes,
        repair_method: item.repair_method,
        parts_used: item.parts_used,
        fixer_name: item.fixer_name,
        ratings: item.ratings,
      });
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      items,
      itemsByEvent: Object.values(itemsByEvent),
      stats,
    });
  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch items' }, { status: 500 });
  }
}
