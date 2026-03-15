import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import pool from "@/lib/db";

// POST /api/volunteer/events - update RSVP
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { eventId, response } = await request.json();
    if (!eventId || !["yes", "no", "maybe"].includes(response)) {
      return NextResponse.json({ success: false, message: "Invalid eventId or response" }, { status: 400 });
    }

    const volResult = await pool.query(
      "SELECT id FROM volunteers WHERE LOWER(email) = LOWER($1)",
      [user.email]
    );
    if (volResult.rows.length === 0) {
      return NextResponse.json({ success: false, message: "Volunteer not found" }, { status: 404 });
    }

    await pool.query(
      `INSERT INTO volunteer_event_rsvps (volunteer_id, event_id, response)
       VALUES ($1, $2, $3)
       ON CONFLICT (volunteer_id, event_id) DO UPDATE SET response = $3`,
      [volResult.rows[0].id, eventId, response]
    );

    return NextResponse.json({ success: true, message: "RSVP updated" });
  } catch (error) {
    console.error("Error updating RSVP:", error);
    return NextResponse.json({ success: false, message: "Failed to update RSVP" }, { status: 500 });
  }
}
