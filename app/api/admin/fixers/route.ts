import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

// GET /api/admin/fixers - list all fixers (from volunteers table where is_fixer = true)
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const userResult = await pool.query(
      `SELECT u.id, u.role FROM users u JOIN sessions s ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [sessionToken]
    );
    if (!userResult.rows[0] || userResult.rows[0].role !== "admin") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const fixersResult = await pool.query(
      `SELECT 
        v.id, v.name, v.email, v.phone, v.skills, v.availability, 
        v.comments, v.status, v.created_at,
        (SELECT COUNT(*) FROM volunteer_event_rsvps ver 
         JOIN events e ON ver.event_id = e.id 
         WHERE ver.volunteer_id = v.id AND e.date >= CURRENT_DATE) as upcoming_events_count
       FROM volunteers v
       WHERE v.is_fixer = true
       ORDER BY v.created_at DESC`
    );

    return NextResponse.json({ success: true, fixers: fixersResult.rows });
  } catch (error) {
    console.error("Error fetching fixers:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch fixers" }, { status: 500 });
  }
}

// PATCH /api/admin/fixers - approve/reject fixer
export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const userResult = await pool.query(
      `SELECT u.id, u.role FROM users u JOIN sessions s ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [sessionToken]
    );
    if (!userResult.rows[0] || userResult.rows[0].role !== "admin") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const { fixerId, action } = await request.json();
    if (!fixerId || !action) {
      return NextResponse.json({ success: false, message: "fixerId and action are required" }, { status: 400 });
    }

    const statusMap: Record<string, string> = { approve: "active", reject: "rejected", remove: "removed" };
    const newStatus = statusMap[action];
    if (!newStatus) {
      return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
    }

    await pool.query("UPDATE volunteers SET status = $1, updated_at = NOW() WHERE id = $2", [newStatus, fixerId]);

    return NextResponse.json({ success: true, message: `Fixer ${action}d successfully` });
  } catch (error) {
    console.error("Error updating fixer:", error);
    return NextResponse.json({ success: false, message: "Failed to update fixer" }, { status: 500 });
  }
}
