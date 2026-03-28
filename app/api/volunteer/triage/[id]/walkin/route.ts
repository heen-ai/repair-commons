import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/auth";
import { randomBytes } from "crypto";

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

// POST /api/volunteer/triage/[id]/walkin - register a walk-in guest
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyVolunteerAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;
  const { name, email, item_name, item_problem, item_type, no_phone } = await req.json();

  if (!name || !item_name || !item_problem) {
    return NextResponse.json({ success: false, message: "Name, item, and problem are required" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Create or find user
    const userEmail = email || `walkin-${randomBytes(6).toString("hex")}@walkin.local`;
    let userId: string;

    const existingUser = await client.query(
      "SELECT id FROM users WHERE LOWER(email) = LOWER($1)", [userEmail]
    );

    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id;
    } else {
      const newUser = await client.query(
        "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id",
        [name, userEmail]
      );
      userId = newUser.rows[0].id;
    }

    // Create registration (checked in immediately)
    const qrCode = randomBytes(16).toString("hex");
    const token = randomBytes(16).toString("hex");

    // Get next queue position
    const posResult = await client.query(
      "SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM registrations WHERE event_id = $1",
      [eventId]
    );
    const position = posResult.rows[0].next_pos;

    const regResult = await client.query(
      `INSERT INTO registrations (event_id, user_id, status, qr_code, token, position, checked_in_at)
       VALUES ($1, $2, 'registered', $3, $4, $5, NOW())
       RETURNING id`,
      [eventId, userId, qrCode, token, position]
    );
    const registrationId = regResult.rows[0].id;

    // Create item
    const itemResult = await client.query(
      `INSERT INTO items (registration_id, user_id, event_id, name, problem, item_type, status, queue_position, no_phone)
       VALUES ($1, $2, $3, $4, $5, $6, 'queued', $7, $8)
       RETURNING id, name, problem`,
      [registrationId, userId, eventId, item_name, item_problem, item_type || null, position, no_phone || false]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      item: itemResult.rows[0],
      registration_id: registrationId,
      user_name: name,
      no_phone: no_phone || false,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Walk-in registration error:", error);
    return NextResponse.json({ success: false, message: "Failed to register walk-in" }, { status: 500 });
  } finally {
    client.release();
  }
}
