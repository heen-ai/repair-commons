import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET /api/fixer/events/[id]/queue - get queue items for event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    if (!user || !['admin', 'fixer'].includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id: eventId } = await params;
    const filter = request.nextUrl.searchParams.get('filter') || 'all';
    const sort = request.nextUrl.searchParams.get('sort') || 'position';

    // Get event title
    const eventResult = await pool.query(
      'SELECT title FROM events WHERE id = $1',
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Event not found' }, { status: 404 });
    }

    // Build query
    let statusFilter = '';
    if (filter === 'queued') {
      statusFilter = "AND i.status = 'registered'";
    } else if (filter === 'in-progress') {
      statusFilter = "AND i.status = 'in-progress'";
    } else if (filter === 'completed') {
      statusFilter = "AND i.status = 'completed'";
    }

    let orderBy = 'i.queue_position ASC';
    if (sort === 'name') {
      orderBy = 'i.name ASC';
    }

    const result = await pool.query(
      `SELECT 
        i.id, i.name, i.problem, i.status, i.queue_position,
        u.name as owner_name,
        f.name as fixer_name
       FROM items i
       JOIN registrations r ON i.registration_id = r.id
       JOIN users u ON r.user_id = u.id
       LEFT JOIN users f ON i.fixer_id = f.id
       WHERE r.event_id = $1 AND r.status != 'cancelled'
       ${statusFilter}
       ORDER BY ${orderBy}`,
      [eventId]
    );

    return NextResponse.json({
      success: true,
      eventTitle: eventResult.rows[0].title,
      items: result.rows,
    });
  } catch (error) {
    console.error('Error fetching queue:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch queue' }, { status: 500 });
  }
}
