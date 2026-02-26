import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET /api/admin/events/[id]/checkin-search - search attendees by name or email
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
    const query = request.nextUrl.searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, attendees: [] });
    }

    // Search attendees
    const result = await pool.query(
      `SELECT 
        r.id, r.status, r.checked_in_at,
        u.name, u.email
       FROM registrations r
       JOIN users u ON r.user_id = u.id
       WHERE r.event_id = $1 
         AND r.status != 'cancelled'
         AND (LOWER(u.name) LIKE LOWER($2) OR LOWER(u.email) LIKE LOWER($2))
       ORDER BY u.name
       LIMIT 20`,
      [eventId, `%${query}%`]
    );

    // Get items for each attendee
    const attendees = await Promise.all(
      result.rows.map(async (reg) => {
        const itemsResult = await pool.query(
          'SELECT id, name, problem, status FROM items WHERE registration_id = $1',
          [reg.id]
        );
        return {
          id: reg.id,
          name: reg.name,
          email: reg.email,
          status: reg.status,
          checked_in_at: reg.checked_in_at,
          items: itemsResult.rows,
        };
      })
    );

    return NextResponse.json({
      success: true,
      attendees,
    });
  } catch (error) {
    console.error('Error searching attendees:', error);
    return NextResponse.json({ success: false, message: 'Search failed' }, { status: 500 });
  }
}
