import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import pool from '@/lib/db';
import { requireAuth, getOrCreateUser } from '@/lib/auth';

// POST /api/admin/events/[id]/walkin - create walk-in registration
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
    const { name, email, item_name, item_problem, item_type } = body;

    if (!name || !item_name || !item_problem) {
      return NextResponse.json(
        { success: false, message: 'Name, item name, and problem are required' },
        { status: 400 }
      );
    }

    let userRecord;

    if (email) {
      // Use getOrCreateUser if email provided
      userRecord = await getOrCreateUser(email, name);
    } else {
      // Create walk-in user with placeholder email
      const walkInEmail = `walkin-${Date.now()}@walkin.local`;
      const result = await pool.query(
        `INSERT INTO users (email, name, role) VALUES ($1, $2, 'attendee') RETURNING *`,
        [walkInEmail, name]
      );
      userRecord = result.rows[0];
    }

    // Generate QR code
    const qrCode = randomBytes(16).toString('hex');

    // Create registration
    const registrationResult = await pool.query(
      `INSERT INTO registrations (event_id, user_id, status, qr_code, checked_in_at) 
       VALUES ($1, $2, 'registered', $3, NOW()) RETURNING *`,
      [eventId, userRecord.id, qrCode]
    );
    const registration = registrationResult.rows[0];

    // Create item
    const itemResult = await pool.query(
      `INSERT INTO items (registration_id, user_id, event_id, name, problem, item_type) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [registration.id, userRecord.id, eventId, item_name, item_problem, item_type || null]
    );
    const item = itemResult.rows[0];

    return NextResponse.json({
      success: true,
      registration: {
        id: registration.id,
        qr_code: registration.qr_code,
        status: registration.status,
        checked_in_at: registration.checked_in_at,
      },
      user: {
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
      },
      item: {
        id: item.id,
        name: item.name,
        problem: item.problem,
        item_type: item.item_type,
      },
    });
  } catch (error) {
    console.error('Error creating walk-in registration:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create walk-in registration' },
      { status: 500 }
    );
  }
}
