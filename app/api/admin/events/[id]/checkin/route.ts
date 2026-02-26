import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// POST /api/admin/events/[id]/checkin - perform check-in
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id: eventId } = await params;
    const body = await request.json();
    const { registrationId } = body;

    if (!registrationId) {
      return NextResponse.json({ success: false, message: 'Registration ID required' }, { status: 400 });
    }

    // Check registration exists and belongs to event
    const regCheck = await pool.query(
      `SELECT id, status FROM registrations WHERE id = $1 AND event_id = $2 AND status != 'cancelled'`,
      [registrationId, eventId]
    );

    if (regCheck.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Registration not found' }, { status: 404 });
    }

    if (regCheck.rows[0].status === 'checked_in') {
      return NextResponse.json({ success: false, message: 'Already checked in' }, { status: 400 });
    }

    // Perform check-in
    await pool.query(
      `UPDATE registrations 
       SET status = 'checked_in', checked_in_at = NOW(), updated_at = NOW() 
       WHERE id = $1`,
      [registrationId]
    );

    return NextResponse.json({
      success: true,
      message: 'Checked in successfully',
    });
  } catch (error) {
    console.error('Error checking in:', error);
    return NextResponse.json({ success: false, message: 'Check-in failed' }, { status: 500 });
  }
}
