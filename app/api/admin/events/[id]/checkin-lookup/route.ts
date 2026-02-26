import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET /api/admin/events/[id]/checkin-lookup - lookup registration by QR code
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
    const qrCode = request.nextUrl.searchParams.get('qr');

    if (!qrCode) {
      return NextResponse.json({ success: false, message: 'QR code required' }, { status: 400 });
    }

    // Find registration by QR code
    const regResult = await pool.query(
      `SELECT 
        r.id, r.status, r.checked_in_at,
        u.name, u.email
       FROM registrations r
       JOIN users u ON r.user_id = u.id
       WHERE r.qr_code = $1 AND r.event_id = $2 AND r.status != 'cancelled'`,
      [qrCode, eventId]
    );

    if (regResult.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Registration not found for this event' }, { status: 404 });
    }

    const reg = regResult.rows[0];

    // Get items
    const itemsResult = await pool.query(
      `SELECT id, name, problem, status FROM items WHERE registration_id = $1`,
      [reg.id]
    );

    return NextResponse.json({
      success: true,
      attendee: {
        id: reg.id,
        name: reg.name,
        email: reg.email,
        status: reg.status,
        checked_in_at: reg.checked_in_at,
        items: itemsResult.rows,
      },
    });
  } catch (error) {
    console.error('Error looking up QR code:', error);
    return NextResponse.json({ success: false, message: 'Lookup failed' }, { status: 500 });
  }
}
