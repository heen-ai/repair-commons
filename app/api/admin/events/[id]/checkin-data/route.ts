import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET /api/admin/events/[id]/checkin-data - get event info and check-in counts
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
      'SELECT id, title FROM events WHERE id = $1',
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Event not found' }, { status: 404 });
    }

    // Get counts
    const countResult = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'checked_in' THEN 1 END) as checked_in
       FROM registrations 
       WHERE event_id = $1 AND status != 'cancelled'`,
      [eventId]
    );

    return NextResponse.json({
      success: true,
      event: eventResult.rows[0],
      totalCount: parseInt(countResult.rows[0].total),
      checkedInCount: parseInt(countResult.rows[0].checked_in),
    });
  } catch (error) {
    console.error('Error fetching checkin data:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch data' }, { status: 500 });
  }
}
