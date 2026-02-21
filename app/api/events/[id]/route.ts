import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await pool.query(
      `SELECT e.*, v.name as venue_name, v.address as venue_address, v.city as venue_city,
              v.postal_code as venue_postal_code,
              (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status != 'cancelled') as registration_count
       FROM events e
       LEFT JOIN venues v ON e.venue_id = v.id
       WHERE e.id = $1`,
      [params.id]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, message: "Event not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, event: result.rows[0] });
  } catch (error) {
    console.error("Error fetching event:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch event" }, { status: 500 });
  }
}
