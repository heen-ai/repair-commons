import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT e.*, v.name as venue_name, v.address as venue_address, v.city as venue_city,
              (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status != 'cancelled') as registration_count
       FROM events e
       LEFT JOIN venues v ON e.venue_id = v.id
       WHERE e.status = 'published' AND e.date >= CURRENT_DATE
       ORDER BY e.date ASC, e.start_time ASC`
    );
    return NextResponse.json({ success: true, events: result.rows });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch events" }, { status: 500 });
  }
}
