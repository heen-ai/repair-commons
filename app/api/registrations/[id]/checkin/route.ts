import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const token = body.token || req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token required" }, { status: 401 });

  // Verify registration
  const regResult = await pool.query(
    `SELECT r.id, r.user_id, r.event_id, r.status FROM registrations r WHERE r.id = $1 AND r.token = $2`,
    [id, token]
  );
  if (regResult.rows.length === 0) return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  const reg = regResult.rows[0];
  if (reg.status === 'checked_in') return NextResponse.json({ error: "Already checked in" }, { status: 400 });

  // Update name if provided
  if (body.name && body.name.trim()) {
    await pool.query(`UPDATE users SET name = $1 WHERE id = $2`, [body.name.trim(), reg.user_id]);
  }

  // Update items if provided (edits to existing items)
  if (body.items && Array.isArray(body.items)) {
    for (const item of body.items) {
      if (item.id && item.name) {
        await pool.query(
          `UPDATE items SET name = $1, problem = COALESCE($2, problem) WHERE id = $3 AND registration_id = $4`,
          [item.name, item.problem || null, item.id, id]
        );
      }
    }
  }

  // Add new items if provided
  if (body.newItems && Array.isArray(body.newItems)) {
    for (const item of body.newItems) {
      if (item.name && item.name.trim()) {
        await pool.query(
          `INSERT INTO items (registration_id, event_id, name, problem, item_type, status) VALUES ($1, $2, $3, $4, $5, 'registered')`,
          [id, reg.event_id, item.name.trim(), item.problem || '', item.item_type || 'other']
        );
      }
    }
  }

  // Get max queue position for this event
  const maxPos = await pool.query(
    `SELECT COALESCE(MAX(i.queue_position), 0) as max_pos
     FROM items i
     JOIN registrations r ON i.registration_id = r.id
     WHERE r.event_id = $1`,
    [reg.event_id]
  );
  const nextPos = (maxPos.rows[0]?.max_pos || 0) + 1;

  // Check in the registration
  await pool.query(
    `UPDATE registrations SET status = 'checked_in', checked_in_at = NOW() WHERE id = $1`,
    [id]
  );

  // Set queue position: only the primary item gets queued now, rest stay as 'registered'
  const primaryItemId = body.primaryItemId;
  const allItems = await pool.query(
    `SELECT id FROM items WHERE registration_id = $1 AND status NOT IN ('cancelled') ORDER BY created_at`,
    [id]
  );

  if (allItems.rows.length === 1) {
    // Single item - just queue it
    await pool.query(
      `UPDATE items SET status = 'queued', queue_position = $1 WHERE registration_id = $2 AND status NOT IN ('cancelled')`,
      [nextPos, id]
    );
  } else if (allItems.rows.length > 1) {
    // Multiple items - primary gets queued, rest stay registered (will queue later)
    const primaryId = primaryItemId || allItems.rows[0].id;
    await pool.query(
      `UPDATE items SET status = 'queued', queue_position = $1 WHERE id = $2`,
      [nextPos, primaryId]
    );
    // Mark the rest as waiting (not in queue yet)
    await pool.query(
      `UPDATE items SET status = 'waiting' WHERE registration_id = $1 AND id != $2 AND status NOT IN ('cancelled')`,
      [id, primaryId]
    );
  }

  return NextResponse.json({ success: true, message: "Checked in!" });
}
