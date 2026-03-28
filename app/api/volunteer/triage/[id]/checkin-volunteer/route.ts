import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

async function verifyVolunteerAuth() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) return null;

  const userResult = await pool.query(
    `SELECT u.id, u.email, u.name, u.role FROM users u JOIN sessions s ON s.user_id = u.id
     WHERE s.token = $1 AND s.expires_at > NOW()`,
    [sessionToken]
  );
  const user = userResult.rows[0];
  if (!user) return null;

  if (user.role === "admin") return user;

  const volResult = await pool.query(
    `SELECT is_helper, is_fixer FROM volunteers WHERE LOWER(email) = LOWER($1) AND status = 'approved'`,
    [user.email]
  );
  if (volResult.rows[0]?.is_helper || volResult.rows[0]?.is_fixer) return user;

  return null;
}

// POST /api/volunteer/triage/[id]/checkin-volunteer - helper checks in a fixer or helper
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyVolunteerAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;
  const { volunteerId, tableNumber } = await req.json();

  if (!volunteerId) {
    return NextResponse.json({ success: false, message: "volunteerId required" }, { status: 400 });
  }

  // Verify the volunteer exists and RSVP'd
  const volResult = await pool.query(
    `SELECT v.id, v.name, v.is_fixer, v.is_helper, v.email
     FROM volunteers v
     WHERE v.id = $1 AND v.status = 'approved'`,
    [volunteerId]
  );
  const vol = volResult.rows[0];
  if (!vol) {
    return NextResponse.json({ success: false, message: "Volunteer not found" }, { status: 404 });
  }

  // Insert into fixer_event_rsvps (the day-of check-in table)
  await pool.query(
    `INSERT INTO fixer_event_rsvps (fixer_id, event_id, checked_in_at, table_number)
     VALUES ($1, $2, NOW(), $3)
     ON CONFLICT (fixer_id, event_id) DO UPDATE SET checked_in_at = NOW(), table_number = COALESCE($3, fixer_event_rsvps.table_number)`,
    [volunteerId, eventId, tableNumber || null]
  );

  return NextResponse.json({ success: true, name: vol.name, role: vol.is_fixer ? "fixer" : "helper" });
}

// GET /api/volunteer/triage/[id]/checkin-volunteer - list volunteers who RSVP'd yes but haven't checked in
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyVolunteerAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;

  const result = await pool.query(`
    SELECT v.id, v.name, v.is_fixer, v.is_helper,
      CASE WHEN fer.checked_in_at IS NOT NULL THEN true ELSE false END as checked_in
    FROM volunteers v
    JOIN volunteer_event_rsvps ver ON ver.volunteer_id = v.id AND ver.event_id = $1 AND ver.response = 'yes'
    LEFT JOIN fixer_event_rsvps fer ON fer.fixer_id = v.id AND fer.event_id = $1
    WHERE v.status = 'approved'
    ORDER BY v.is_fixer DESC, v.name
  `, [eventId]);

  return NextResponse.json({ volunteers: result.rows });
}
