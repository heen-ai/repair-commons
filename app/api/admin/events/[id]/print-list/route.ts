import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET /api/admin/events/[id]/print-list - get all registrations for printing
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

    // Get all registrations with user info and items
    const result = await pool.query(
      `SELECT 
        r.id,
        r.status,
        r.qr_code,
        r.checked_in_at,
        r.created_at as registered_at,
        u.name,
        u.email
       FROM registrations r
       JOIN users u ON r.user_id = u.id
       WHERE r.event_id = $1
       ORDER BY u.name`,
      [eventId]
    );

    // Get items for each registration
    const registrations = await Promise.all(
      result.rows.map(async (reg) => {
        const itemsResult = await pool.query(
          `SELECT name, problem, status, item_type 
           FROM items 
           WHERE registration_id = $1
           ORDER BY created_at`,
          [reg.id]
        );
        return {
          id: reg.id,
          name: reg.name,
          email: reg.email,
          status: reg.status,
          qr_code: reg.qr_code,
          checked_in_at: reg.checked_in_at,
          registered_at: reg.registered_at,
          items: itemsResult.rows.map(item => item.name).join(', '),
          items_detail: itemsResult.rows,
        };
      })
    );

    // Get event info
    const eventResult = await pool.query(
      `SELECT e.id, e.title, e.date, e.start_time, e.end_time, e.notes,
              v.name as venue_name, v.address as venue_address
       FROM events e
       LEFT JOIN venues v ON e.venue_id = v.id
       WHERE e.id = $1`,
      [eventId]
    );

    return NextResponse.json({
      success: true,
      event: eventResult.rows[0],
      registrations,
    });
  } catch (error) {
    console.error('Error fetching print list:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch registrations' }, { status: 500 });
  }
}
