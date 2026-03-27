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

// POST /api/volunteer/triage/[id]/assign - assign a fixer to an item
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyVolunteerAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;
  const { itemId, fixerId } = await req.json();

  if (!itemId || !fixerId) {
    return NextResponse.json({ error: "itemId and fixerId required" }, { status: 400 });
  }

  // Resolve volunteer ID to user ID
  const volResult = await pool.query(
    `SELECT u.id FROM volunteers v JOIN users u ON u.email = v.email WHERE v.id = $1`,
    [fixerId]
  );
  const fixerUserId = volResult.rows[0]?.id;
  if (!fixerUserId) {
    return NextResponse.json({ error: "Fixer not found" }, { status: 404 });
  }

  // Update item with fixer assignment
  await pool.query(
    `UPDATE items SET fixer_id = $1, status = 'in_progress', repair_started_at = NOW(), updated_at = NOW()
     WHERE id = $2 AND event_id = $3`,
    [fixerUserId, itemId, eventId]
  );

  // Also add to item_fixers join table
  await pool.query(
    `INSERT INTO item_fixers (item_id, fixer_id, role, assigned_at)
     VALUES ($1, $2, 'primary', NOW())
     ON CONFLICT (item_id, fixer_id) DO NOTHING`,
    [itemId, fixerUserId]
  );

  return NextResponse.json({ success: true });
}
