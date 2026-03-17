import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET /api/admin/events/[id]/live - get live room view data
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
      `SELECT e.id, e.title, e.date, e.start_time, e.end_time,
              v.name as venue_name
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
        COUNT(*) as total_registered,
        COUNT(CASE WHEN status = 'checked_in' THEN 1 END) as checked_in
       FROM registrations 
       WHERE event_id = $1 AND status IN ('registered', 'waitlisted', 'checked_in')`,
      [eventId]
    );

    // Get item stats
    const itemStats = await pool.query(
      `SELECT 
        COUNT(CASE WHEN status = 'registered' THEN 1 END) as items_waiting,
        COUNT(CASE WHEN status IN ('fixer_assigned', 'in-progress') THEN 1 END) as items_in_progress,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as items_completed
       FROM items 
       WHERE event_id = $1`,
      [eventId]
    );

    // Get fixers count
    const fixerStats = await pool.query(
      `SELECT COUNT(*) as fixers_present
       FROM fixer_event_rsvps 
       WHERE event_id = $1 AND status = 'checked_in'`,
      [eventId]
    );

    // Get waiting items (registered status, ordered by queue position)
    const waitingItems = await pool.query(
      `SELECT i.id, i.name, i.item_type, i.problem, i.queue_position,
              u.name as owner_name,
              EXTRACT(EPOCH FROM (NOW() - i.created_at)) / 60 as wait_minutes
       FROM items i
       JOIN registrations r ON i.registration_id = r.id
       JOIN users u ON r.user_id = u.id
       WHERE i.event_id = $1 AND i.status = 'registered'
       ORDER BY i.queue_position ASC NULLS LAST`,
      [eventId]
    );

    // Get in-progress items (fixer_assigned or in-progress status)
    const inProgressItems = await pool.query(
      `SELECT i.id, i.name, i.item_type, i.repair_started_at,
              u.name as owner_name,
              fixer.name as fixer_name,
              fer.table_number as fixer_table,
              EXTRACT(EPOCH FROM (NOW() - i.repair_started_at)) / 60 as elapsed_minutes
       FROM items i
       JOIN registrations r ON i.registration_id = r.id
       JOIN users u ON r.user_id = u.id
       LEFT JOIN users fixer ON i.fixer_id = fixer.id
       LEFT JOIN fixer_event_rsvps fer ON i.fixer_id = fer.fixer_id AND fer.event_id = i.event_id
       WHERE i.event_id = $1 AND i.status IN ('fixer_assigned', 'in-progress')
       ORDER BY i.repair_started_at ASC`,
      [eventId]
    );

    // Get completed items (most recent first, capped at 20)
    const completedItems = await pool.query(
      `SELECT i.id, i.name, i.item_type, i.outcome, i.repair_completed_at,
              u.name as owner_name,
              fixer.name as fixer_name
       FROM items i
       JOIN registrations r ON i.registration_id = r.id
       JOIN users u ON r.user_id = u.id
       LEFT JOIN users fixer ON i.fixer_id = fixer.id
       WHERE i.event_id = $1 AND i.status = 'completed'
       ORDER BY i.repair_completed_at DESC
       LIMIT 20`,
      [eventId]
    );

    // Get fixers with their current assignments
    const fixers = await pool.query(
      `SELECT u.id, u.name, fer.table_number, fer.checked_in_at,
              i.id as current_item_id, i.name as current_item_name
       FROM fixer_event_rsvps fer
       JOIN users u ON fer.fixer_id = u.id
       LEFT JOIN items i ON i.fixer_id = fer.fixer_id 
         AND i.event_id = fer.event_id 
         AND i.status IN ('fixer_assigned', 'in-progress')
       WHERE fer.event_id = $1 AND fer.status = 'checked_in'
       ORDER BY fer.checked_in_at ASC`,
      [eventId]
    );

    const reg = regStats.rows[0];
    const items = itemStats.rows[0];
    const fixerCount = fixerStats.rows[0];

    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        title: event.title,
        date: event.date,
        start_time: event.start_time,
        end_time: event.end_time,
        venue_name: event.venue_name
      },
      stats: {
        total_registered: parseInt(reg.total_registered || '0'),
        checked_in: parseInt(reg.checked_in || '0'),
        items_waiting: parseInt(items.items_waiting || '0'),
        items_in_progress: parseInt(items.items_in_progress || '0'),
        items_completed: parseInt(items.items_completed || '0'),
        fixers_present: parseInt(fixerCount.fixers_present || '0')
      },
      waiting_items: waitingItems.rows.map(item => ({
        id: item.id,
        name: item.name,
        item_type: item.item_type,
        problem: item.problem,
        owner_name: item.owner_name,
        wait_minutes: Math.round(parseFloat(item.wait_minutes || '0')),
        queue_position: item.queue_position
      })),
      in_progress_items: inProgressItems.rows.map(item => ({
        id: item.id,
        name: item.name,
        item_type: item.item_type,
        owner_name: item.owner_name,
        fixer_name: item.fixer_name,
        fixer_table: item.fixer_table,
        elapsed_minutes: item.repair_started_at ? Math.round(parseFloat(item.elapsed_minutes || '0')) : 0
      })),
      completed_items: completedItems.rows.map(item => ({
        id: item.id,
        name: item.name,
        item_type: item.item_type,
        owner_name: item.owner_name,
        fixer_name: item.fixer_name,
        outcome: item.outcome,
        repair_completed_at: item.repair_completed_at
      })),
      fixers: fixers.rows.map(fixer => ({
        id: fixer.id,
        name: fixer.name,
        table_number: fixer.table_number,
        checked_in_at: fixer.checked_in_at,
        current_item_id: fixer.current_item_id,
        current_item_name: fixer.current_item_name
      }))
    });

  } catch (error) {
    console.error('Error fetching live room data:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch live data' }, { status: 500 });
  }
}