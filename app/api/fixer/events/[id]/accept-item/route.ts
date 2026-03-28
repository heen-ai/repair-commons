import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// POST /api/fixer/events/[id]/accept-item - fixer accepts a suggested item
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;
  const { itemId } = await req.json();
  if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

  // Verify item is still available
  const itemResult = await pool.query(
    `SELECT i.id, i.status, i.fixer_id FROM items i
     JOIN registrations r ON i.registration_id = r.id
     WHERE i.id = $1 AND i.event_id = $2 AND r.status = 'checked_in'
       AND i.status IN ('queued', 'registered') AND (i.fixer_id IS NULL OR i.fixer_id = $3)`,
    [itemId, eventId, user.id]
  );

  if (itemResult.rows.length === 0) {
    return NextResponse.json({ error: "Item no longer available" }, { status: 409 });
  }

  // Assign fixer and start repair
  await pool.query(
    `UPDATE items SET fixer_id = $1, status = 'in_progress', repair_started_at = NOW(), updated_at = NOW() WHERE id = $2`,
    [user.id, itemId]
  );

  // Also add to item_fixers join table
  await pool.query(
    `INSERT INTO item_fixers (item_id, fixer_id, role, assigned_at) VALUES ($1, $2, 'primary', NOW())
     ON CONFLICT (item_id, fixer_id) DO NOTHING`,
    [itemId, user.id]
  );

  // Mark fixer as busy (clear ready flag if exists)
  await pool.query(
    `UPDATE fixer_event_rsvps SET ready_for_next = false WHERE fixer_id = $1 AND event_id = $2`,
    [user.id, eventId]
  );

  return NextResponse.json({ success: true });
}
