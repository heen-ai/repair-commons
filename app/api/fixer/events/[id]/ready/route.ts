import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// POST /api/fixer/events/[id]/ready - toggle ready for next item
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;
  const { ready } = await req.json().catch(() => ({ ready: true }));

  await pool.query(
    `UPDATE fixer_event_rsvps SET ready_for_next = $1, ready_at = CASE WHEN $1 THEN NOW() ELSE NULL END
     WHERE fixer_id = $2 AND event_id = $3`,
    [ready, user.id, eventId]
  );

  return NextResponse.json({ success: true, ready });
}
