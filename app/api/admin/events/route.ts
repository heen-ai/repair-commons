import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
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

    // Validation
    if (!title || !date || !start_time || !end_time) {
      return NextResponse.json(
        { success: false, message: "Title, date, start_time, and end_time are required" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO events (
        title, description, date, start_time, end_time, 
        venue_id, capacity, status, registration_opens_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        title,
        description || null,
        date,
        start_time,
        end_time,
        venue_id || null,
        capacity || 40,
        status || "draft",
        registration_opens_at || null,
      ]
    );

    return NextResponse.json({
      success: true,
      event: result.rows[0],
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create event" },
      { status: 500 }
    );
  }
}
