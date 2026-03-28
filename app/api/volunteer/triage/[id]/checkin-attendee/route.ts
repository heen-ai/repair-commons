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
    SELECT r.id, r.user_id, u.name, u.email, r.status,
      (SELECT COUNT(*) FROM items i WHERE i.registration_id = r.id AND i.status != 'cancelled')::int as item_count,
      (SELECT json_agg(json_build_object('id', i.id, 'name', i.name, 'problem', i.problem, 'status', i.status) ORDER BY i.created_at) 
       FROM items i WHERE i.registration_id = r.id AND i.status != 'cancelled') as items
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

// POST - check in an attendee by registration ID (with optional name/item edits)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await verifyVolunteerOrAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eventId = params.id;
  const body = await req.json();
  const { registrationId, name, items, newItems, primaryItemId } = body;
  if (!registrationId) return NextResponse.json({ error: "registrationId required" }, { status: 400 });

  // Get registration info
  const regResult = await pool.query(
    `SELECT r.id, r.user_id FROM registrations r WHERE r.id = $1 AND r.event_id = $2 AND r.status != 'cancelled'`,
    [registrationId, eventId]
  );
  if (regResult.rows.length === 0) return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  const reg = regResult.rows[0];

  // Update name if provided
  if (name && name.trim()) {
    await pool.query(`UPDATE users SET name = $1 WHERE id = $2`, [name.trim(), reg.user_id]);
  }

  // Update existing items if provided
  if (items && Array.isArray(items)) {
    for (const item of items) {
      if (item.id && item.name) {
        await pool.query(
          `UPDATE items SET name = $1, problem = COALESCE(NULLIF($2, ''), problem) WHERE id = $3 AND registration_id = $4`,
          [item.name, item.problem || '', item.id, registrationId]
        );
      }
    }
  }

  // Add new items
  if (newItems && Array.isArray(newItems)) {
    for (const item of newItems) {
      if (item.name && item.name.trim()) {
        await pool.query(
          `INSERT INTO items (registration_id, event_id, name, problem, item_type, status) VALUES ($1, $2, $3, $4, $5, 'registered')`,
          [registrationId, eventId, item.name.trim(), item.problem || '', item.item_type || 'other']
        );
      }
    }
  }

  // Get max queue position
  const maxPos = await pool.query(
    `SELECT COALESCE(MAX(i.queue_position), 0) as max_pos
     FROM items i JOIN registrations r ON i.registration_id = r.id WHERE r.event_id = $1`,
    [eventId]
  );
  const nextPos = (maxPos.rows[0]?.max_pos || 0) + 1;

  // Check in
  await pool.query(
    `UPDATE registrations SET status = 'checked_in', checked_in_at = NOW() WHERE id = $1 AND event_id = $2`,
    [registrationId, eventId]
  );

  // Get all items for this registration
  const allItems = await pool.query(
    `SELECT id FROM items WHERE registration_id = $1 AND status NOT IN ('cancelled') ORDER BY created_at`,
    [registrationId]
  );

  if (allItems.rows.length === 1) {
    // Single item - just queue it
    await pool.query(
      `UPDATE items SET status = 'queued', queue_position = $1 WHERE registration_id = $2 AND status NOT IN ('cancelled')`,
      [nextPos, registrationId]
    );
  } else if (allItems.rows.length > 1) {
    // Multiple items - primary gets queued, rest wait
    const primaryId = primaryItemId || allItems.rows[0].id;
    await pool.query(`UPDATE items SET status = 'queued', queue_position = $1 WHERE id = $2`, [nextPos, primaryId]);
    await pool.query(
      `UPDATE items SET status = 'waiting' WHERE registration_id = $1 AND id != $2 AND status NOT IN ('cancelled')`,
      [registrationId, primaryId]
    );
  }

  return NextResponse.json({ success: true });
}
