import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// POST /api/fixer/events/[id]/checkin - check in to an event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // Only fixers and admins can check in
    if (user.role !== "fixer" && user.role !== "admin") {
      return NextResponse.json({ success: false, message: "Only fixers can check in" }, { status: 403 });
    }

    const { id: eventId } = await params;
    let body: { table_number?: string } = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const { table_number } = body;

    // Upsert: insert or update the fixer RSVP with checked_in status
    const result = await pool.query(
      `INSERT INTO fixer_event_rsvps (fixer_id, event_id, status, checked_in_at, table_number)
       VALUES ($1, $2, 'checked_in', NOW(), $3)
       ON CONFLICT (fixer_id, event_id)
       DO UPDATE SET 
         status = 'checked_in',
         checked_in_at = NOW(),
         table_number = COALESCE(EXCLUDED.table_number, fixer_event_rsvps.table_number)
       RETURNING *`,
      [user.id, eventId, table_number || null]
    );

    return NextResponse.json({
      success: true,
      rsvp: result.rows[0]
    });
  } catch (error) {
    console.error("Error checking in to event:", error);
    return NextResponse.json({ success: false, message: "Failed to check in" }, { status: 500 });
  }
}

// GET /api/fixer/events/[id]/checkin - check current check-in status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id: eventId } = await params;

    const result = await pool.query(
      `SELECT * FROM fixer_event_rsvps WHERE fixer_id = $1 AND event_id = $2`,
      [user.id, eventId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: true, checked_in: false });
    }

    return NextResponse.json({
      success: true,
      checked_in: result.rows[0].status === "checked_in",
      checked_in_at: result.rows[0].checked_in_at,
      table_number: result.rows[0].table_number
    });
  } catch (error) {
    console.error("Error checking check-in status:", error);
    return NextResponse.json({ success: false, message: "Failed to check status" }, { status: 500 });
  }
}