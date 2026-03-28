import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

async function verifyVolunteerOrAdmin() {
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

// GET - search registered attendees for this event
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await verifyVolunteerOrAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eventId = params.id;
  const q = new URL(req.url).searchParams.get("q") || "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const result = await pool.query(`
    SELECT r.id, u.name, u.email, r.status,
      (SELECT COUNT(*) FROM items i WHERE i.registration_id = r.id)::int as item_count
    FROM registrations r
    JOIN users u ON r.user_id = u.id
    WHERE r.event_id = $1
      AND r.status != 'cancelled'
      AND LOWER(u.name) LIKE LOWER($2)
    ORDER BY u.name
    LIMIT 10
  `, [eventId, `%${q}%`]);

  return NextResponse.json({ results: result.rows });
}

// POST - check in an attendee by registration ID
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await verifyVolunteerOrAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eventId = params.id;
  const { registrationId } = await req.json();
  if (!registrationId) return NextResponse.json({ error: "registrationId required" }, { status: 400 });

  // Update registration status and set queue position
  const maxPos = await pool.query(
    `SELECT COALESCE(MAX(i.queue_position), 0) as max_pos
     FROM items i
     JOIN registrations r ON i.registration_id = r.id
     WHERE r.event_id = $1`,
    [eventId]
  );
  const nextPos = (maxPos.rows[0]?.max_pos || 0) + 1;

  await pool.query(
    `UPDATE registrations SET status = 'checked_in', checked_in_at = NOW() WHERE id = $1 AND event_id = $2`,
    [registrationId, eventId]
  );

  // Set queue positions on items that don't have one yet
  await pool.query(
    `UPDATE items SET status = 'queued', queue_position = $3
     WHERE registration_id = $1 AND event_id = $2 AND (queue_position IS NULL OR status = 'registered')`,
    [registrationId, eventId, nextPos]
  );

  return NextResponse.json({ success: true });
}
