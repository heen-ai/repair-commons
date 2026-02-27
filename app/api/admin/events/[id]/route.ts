import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    // Auth check
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const userResult = await pool.query(
      `SELECT u.id, u.email, u.name, u.role
       FROM users u JOIN sessions s ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [sessionToken]
    );

    const user = userResult.rows[0];
    if (!user || user.role !== "admin") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const result = await pool.query(
      `SELECT e.*, v.name as venue_name, v.address as venue_address, v.city as venue_city
       FROM events e
       LEFT JOIN venues v ON e.venue_id = v.id
       WHERE e.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, message: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      event: result.rows[0],
    });
  } catch (error) {
    console.error("Error fetching event:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch event" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    // Auth check
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const userResult = await pool.query(
      `SELECT u.id, u.email, u.name, u.role
       FROM users u JOIN sessions s ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [sessionToken]
    );

    const user = userResult.rows[0];
    if (!user || user.role !== "admin") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      date,
      start_time,
      end_time,
      venue_id,
      capacity,
      status,
      registration_opens_at,
    } = body;

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (date !== undefined) {
      updates.push(`date = $${paramIndex++}`);
      values.push(date);
    }
    if (start_time !== undefined) {
      updates.push(`start_time = $${paramIndex++}`);
      values.push(start_time);
    }
    if (end_time !== undefined) {
      updates.push(`end_time = $${paramIndex++}`);
      values.push(end_time);
    }
    if (venue_id !== undefined) {
      updates.push(`venue_id = $${paramIndex++}`);
      values.push(venue_id);
    }
    if (capacity !== undefined) {
      updates.push(`capacity = $${paramIndex++}`);
      values.push(capacity);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (registration_opens_at !== undefined) {
      updates.push(`registration_opens_at = $${paramIndex++}`);
      values.push(registration_opens_at);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, message: "No fields to update" },
        { status: 400 }
      );
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE events SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, message: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      event: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating event:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update event" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    // Auth check
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const userResult = await pool.query(
      `SELECT u.id, u.email, u.name, u.role
       FROM users u JOIN sessions s ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [sessionToken]
    );

    const user = userResult.rows[0];
    if (!user || user.role !== "admin") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const result = await pool.query(
      `DELETE FROM events WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, message: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting event:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete event" },
      { status: 500 }
    );
  }
}
