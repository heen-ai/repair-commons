import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

// GET /api/checkin/lookup?q=name - search attendees, fixers, helpers by name
// GET /api/checkin/lookup?action=get_token&userId=... - get registration token for attendee
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "get_token") {
      const userId = searchParams.get("userId");
      if (!userId) {
        return NextResponse.json({ success: false, message: "userId required" }, { status: 400 });
      }

      // Get the next upcoming event
      const eventResult = await pool.query(
        `SELECT id FROM events WHERE date >= CURRENT_DATE AND status != 'cancelled' ORDER BY date ASC LIMIT 1`
      );
      if (eventResult.rows.length === 0) {
        return NextResponse.json({ success: false, message: "No upcoming event" });
      }
      const eventId = eventResult.rows[0].id;

      const regResult = await pool.query(
        `SELECT id, token FROM registrations WHERE user_id = $1 AND event_id = $2 AND status != 'cancelled' LIMIT 1`,
        [userId, eventId]
      );

      if (regResult.rows.length === 0) {
        return NextResponse.json({ success: false, message: "No registration found" });
      }

      return NextResponse.json({
        success: true,
        registrationId: regResult.rows[0].id,
        token: regResult.rows[0].token,
      });
    }

    const query = searchParams.get("q");
    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, results: [] });
    }

    // Get next upcoming event
    const eventResult = await pool.query(
      `SELECT id FROM events WHERE date >= CURRENT_DATE AND status != 'cancelled' ORDER BY date ASC LIMIT 1`
    );
    if (eventResult.rows.length === 0) {
      return NextResponse.json({ success: true, results: [] });
    }
    const eventId = eventResult.rows[0].id;

    const searchTerm = `%${query.toLowerCase()}%`;

    // Search attendees (registered for this event)
    const attendeesResult = await pool.query(
      `SELECT u.id, u.name, u.email, 
        ARRAY_AGG(i.name ORDER BY i.created_at) FILTER (WHERE i.name IS NOT NULL AND i.status != 'cancelled') as items
       FROM registrations r
       JOIN users u ON r.user_id = u.id
       LEFT JOIN items i ON i.registration_id = r.id
       WHERE r.event_id = $1 AND r.status != 'cancelled'
         AND LOWER(u.name) LIKE $2
       GROUP BY u.id, u.name, u.email
       ORDER BY u.name
       LIMIT 10`,
      [eventId, searchTerm]
    );

    // Search fixers and helpers (volunteers)
    const volunteersResult = await pool.query(
      `SELECT v.id, v.name, v.email, v.is_fixer, v.is_helper
       FROM volunteers v
       WHERE v.status = 'approved' AND LOWER(v.name) LIKE $1
       ORDER BY v.name
       LIMIT 10`,
      [searchTerm]
    );

    const results: Array<{
      id: string;
      name: string;
      email: string;
      type: "attendee" | "fixer" | "helper";
      items?: string[];
    }> = [];

    for (const row of attendeesResult.rows) {
      results.push({
        id: row.id,
        name: row.name,
        email: row.email,
        type: "attendee",
        items: row.items || [],
      });
    }

    for (const row of volunteersResult.rows) {
      // Don't duplicate if already in attendees
      if (!results.find((r) => r.email === row.email)) {
        results.push({
          id: row.id,
          name: row.name,
          email: row.email,
          type: row.is_fixer ? "fixer" : "helper",
        });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Checkin lookup error:", error);
    return NextResponse.json({ success: false, message: "Search failed" }, { status: 500 });
  }
}
