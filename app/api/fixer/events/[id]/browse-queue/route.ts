import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// GET /api/fixer/events/[id]/browse-queue - fixer browses all waiting items
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;

  const result = await pool.query(`
    SELECT i.id, i.name, i.problem, i.item_type, i.queue_position,
      u.name as owner_name,
      EXISTS(SELECT 1 FROM fixer_interest fi WHERE fi.item_id = i.id AND fi.fixer_id = $2) as my_interest,
      (SELECT COUNT(*) FROM fixer_interest fi2 WHERE fi2.item_id = i.id) as total_interest,
      (SELECT string_agg(v.name, ', ') FROM fixer_interest fi3 JOIN users fu ON fi3.fixer_id = fu.id LEFT JOIN volunteers v ON LOWER(v.email) = LOWER(fu.email) WHERE fi3.item_id = i.id) as interested_fixers
    FROM items i
    JOIN registrations r ON i.registration_id = r.id
    JOIN users u ON r.user_id = u.id
    WHERE i.event_id = $1
      AND r.status = 'checked_in'
      AND i.status IN ('queued', 'registered')
      AND i.fixer_id IS NULL
    ORDER BY i.queue_position ASC NULLS LAST, i.created_at ASC
  `, [eventId, user.id]);

  return NextResponse.json({ items: result.rows });
}
