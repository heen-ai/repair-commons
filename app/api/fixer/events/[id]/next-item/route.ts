import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// GET /api/fixer/events/[id]/next-item?skip=id1,id2 - get next suggested item for this fixer
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;
  const skipIds = (new URL(req.url).searchParams.get("skip") || "").split(",").filter(Boolean);

  const skipClause = skipIds.length > 0
    ? `AND i.id NOT IN (${skipIds.map((_, idx) => `$${idx + 3}`).join(",")})`
    : "";
  const baseParams = [eventId, user.id, ...skipIds];

  // Priority 1: Items this fixer expressed interest in (pre-event), still queued
  const interestResult = await pool.query(`
    SELECT i.id, i.name, i.problem, i.item_type, i.queue_position,
      u.name as owner_name, fi.notes as fixer_notes,
      'interest' as match_reason
    FROM items i
    JOIN fixer_interest fi ON fi.item_id = i.id AND fi.fixer_id = $2
    JOIN registrations r ON i.registration_id = r.id
    JOIN users u ON r.user_id = u.id
    WHERE i.event_id = $1
      AND r.status = 'checked_in'
      AND i.status IN ('queued', 'registered')
      AND i.fixer_id IS NULL
      ${skipClause}
    ORDER BY i.queue_position ASC NULLS LAST, i.created_at ASC
    LIMIT 1
  `, baseParams);

  if (interestResult.rows.length > 0) {
    return NextResponse.json({ item: interestResult.rows[0], hasMore: true });
  }

  // Priority 2: Items pre-assigned to this fixer via item_fixers (helper pre-assigned)
  const preAssignedResult = await pool.query(`
    SELECT i.id, i.name, i.problem, i.item_type, i.queue_position,
      u.name as owner_name,
      'pre_assigned' as match_reason
    FROM items i
    JOIN item_fixers ifx ON ifx.item_id = i.id AND ifx.fixer_id = $2
    JOIN registrations r ON i.registration_id = r.id
    JOIN users u ON r.user_id = u.id
    WHERE i.event_id = $1
      AND r.status = 'checked_in'
      AND i.status IN ('queued', 'registered')
      AND (i.fixer_id IS NULL OR i.fixer_id = $2)
      ${skipClause}
    ORDER BY i.queue_position ASC NULLS LAST, i.created_at ASC
    LIMIT 1
  `, baseParams);

  if (preAssignedResult.rows.length > 0) {
    return NextResponse.json({ item: preAssignedResult.rows[0], hasMore: true });
  }

  // Priority 3: Next unassigned item in general queue
  const generalResult = await pool.query(`
    SELECT i.id, i.name, i.problem, i.item_type, i.queue_position,
      u.name as owner_name,
      'queue' as match_reason
    FROM items i
    JOIN registrations r ON i.registration_id = r.id
    JOIN users u ON r.user_id = u.id
    WHERE i.event_id = $1
      AND r.status = 'checked_in'
      AND i.status IN ('queued', 'registered')
      AND i.fixer_id IS NULL
      ${skipClause}
    ORDER BY i.queue_position ASC NULLS LAST, i.created_at ASC
    LIMIT 1
  `, baseParams);

  if (generalResult.rows.length > 0) {
    return NextResponse.json({ item: generalResult.rows[0], hasMore: true });
  }

  return NextResponse.json({ item: null, hasMore: false });
}
