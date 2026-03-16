import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// GET /api/admin/events/[id]/fixers-present - get list of fixers checked in to an event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id: eventId } = await params;

    const result = await pool.query(
      `SELECT 
        u.id as fixer_id,
        u.name,
        u.email,
        u.phone,
        r.checked_in_at,
        r.table_number
       FROM fixer_event_rsvps r
       JOIN users u ON r.fixer_id = u.id
       WHERE r.event_id = $1 AND r.status = 'checked_in'
       ORDER BY r.checked_in_at ASC`,
      [eventId]
    );

    return NextResponse.json({
      success: true,
      fixers: result.rows
    });
  } catch (error) {
    console.error("Error fetching present fixers:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch fixers" }, { status: 500 });
  }
}