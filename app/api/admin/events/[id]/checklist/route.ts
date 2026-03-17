import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

interface ChecklistCheck {
  id: string;
  label: string;
  status: 'ok' | 'warn' | 'error';
  detail: string;
}

// GET /api/admin/events/[id]/checklist - get pre-event checklist status
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
    const checks: ChecklistCheck[] = [];

    // Get event info first
    const eventResult = await pool.query(
      `SELECT e.id, e.title, e.venue_id, e.capacity, e.date, e.start_time, e.end_time,
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

    // 1. Venue check
    if (event.venue_id) {
      checks.push({
        id: 'venue',
        label: 'Venue confirmed',
        status: 'ok',
        detail: `${event.venue_name}${event.venue_address ? ', ' + event.venue_address : ''}`
      });
    } else {
      checks.push({
        id: 'venue',
        label: 'Venue confirmed',
        status: 'warn',
        detail: 'No venue set'
      });
    }

    // 2. Capacity check
    if (event.capacity && event.capacity > 0) {
      checks.push({
        id: 'capacity',
        label: 'Capacity set',
        status: 'ok',
        detail: `${event.capacity} spots`
      });
    } else {
      checks.push({
        id: 'capacity',
        label: 'Capacity set',
        status: 'warn',
        detail: 'No capacity set'
      });
    }

    // 3. Fixers check - query fixer_event_rsvps
    const fixerResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM fixer_event_rsvps
       WHERE event_id = $1 AND status IN ('confirmed', 'checked_in')`,
      [eventId]
    );
    const fixerCount = parseInt(fixerResult.rows[0]?.count || '0');

    if (fixerCount >= 2) {
      checks.push({
        id: 'fixers',
        label: 'Fixers confirmed',
        status: 'ok',
        detail: `${fixerCount} fixers RSVP'd`
      });
    } else {
      checks.push({
        id: 'fixers',
        label: 'Fixers confirmed',
        status: 'warn',
        detail: `${fixerCount} fixers RSVP'd (need at least 2)`
      });
    }

    // 4. Reminders check - always ok (reminder cron handles it)
    checks.push({
      id: 'reminders',
      label: 'Reminders scheduled',
      status: 'ok',
      detail: 'Auto-scheduled'
    });

    // 5. Registrations check
    const regResult = await pool.query(
      `SELECT 
        COUNT(CASE WHEN status = 'registered' THEN 1 END) as registered,
        COUNT(CASE WHEN status = 'waitlisted' THEN 1 END) as waitlisted
       FROM registrations 
       WHERE event_id = $1`,
      [eventId]
    );

    const registered = parseInt(regResult.rows[0]?.registered || '0');
    const waitlisted = parseInt(regResult.rows[0]?.waitlisted || '0');

    if (registered > 0 || waitlisted > 0) {
      checks.push({
        id: 'registrations',
        label: 'Registrations',
        status: 'ok',
        detail: `${registered} registered${waitlisted > 0 ? `, ${waitlisted} waitlisted` : ''}`
      });
    } else {
      checks.push({
        id: 'registrations',
        label: 'Registrations',
        status: 'warn',
        detail: 'No registrations yet'
      });
    }

    return NextResponse.json({
      success: true,
      checks
    });

  } catch (error) {
    console.error('Error fetching event checklist:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch checklist' }, { status: 500 });
  }
}
