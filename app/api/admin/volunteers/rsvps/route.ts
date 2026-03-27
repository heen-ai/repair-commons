import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

async function verifyAdminAuth() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) return { authorized: false, user: null };
  const userResult = await pool.query(
    `SELECT u.id, u.email, u.name, u.role
     FROM users u JOIN sessions s ON s.user_id = u.id
     WHERE s.token = $1 AND s.expires_at > NOW()`,
    [sessionToken]
  );
  const user = userResult.rows[0];
  if (!user || user.role !== "admin") return { authorized: false, user: null };
  return { authorized: true, user };
}

// GET /api/admin/volunteers/rsvps - get RSVP matrix (all volunteers x upcoming events)
export async function GET() {
  try {
    const { authorized } = await verifyAdminAuth();
    if (!authorized) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // Get upcoming events
    const eventsResult = await pool.query(
      `SELECT id, title, date FROM events 
       WHERE date >= CURRENT_DATE AND status != 'cancelled'
       ORDER BY date ASC`
    );

    // Get all non-archived volunteers
    const volunteersResult = await pool.query(
      `SELECT id, name, email, is_fixer, is_helper, status
       FROM volunteers 
       WHERE status != 'archived'
       ORDER BY name ASC`
    );

    // Get all RSVPs for upcoming events
    const eventIds = eventsResult.rows.map((e: { id: string }) => e.id);
    let rsvps: Record<string, Record<string, string>> = {};
    
    if (eventIds.length > 0) {
      const rsvpResult = await pool.query(
        `SELECT volunteer_id, event_id, response 
         FROM volunteer_event_rsvps 
         WHERE event_id = ANY($1)`,
        [eventIds]
      );
      
      for (const row of rsvpResult.rows) {
        if (!rsvps[row.volunteer_id]) rsvps[row.volunteer_id] = {};
        rsvps[row.volunteer_id][row.event_id] = row.response;
      }
    }

    return NextResponse.json({
      success: true,
      events: eventsResult.rows,
      volunteers: volunteersResult.rows,
      rsvps,
    });
  } catch (error) {
    console.error("Error fetching RSVP matrix:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch RSVP data" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/volunteers/rsvps - set/update a single RSVP
export async function PUT(request: NextRequest) {
  try {
    const { authorized } = await verifyAdminAuth();
    if (!authorized) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { volunteerId, eventId, response } = await request.json();

    if (!volunteerId || !eventId || !response) {
      return NextResponse.json(
        { success: false, message: "volunteerId, eventId, and response are required" },
        { status: 400 }
      );
    }

    if (!["yes", "no", "maybe"].includes(response)) {
      return NextResponse.json(
        { success: false, message: "response must be yes, no, or maybe" },
        { status: 400 }
      );
    }

    // Upsert RSVP
    await pool.query(
      `INSERT INTO volunteer_event_rsvps (volunteer_id, event_id, response, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (volunteer_id, event_id) 
       DO UPDATE SET response = $3`,
      [volunteerId, eventId, response]
    );

    return NextResponse.json({ success: true, response });
  } catch (error) {
    console.error("Error updating RSVP:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update RSVP" },
      { status: 500 }
    );
  }
}
