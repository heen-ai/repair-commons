import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

// GET /api/registrations/[id]/status
// Public endpoint that returns live status for an attendee's registration
// Uses token query param for security instead of auth
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: regId } = await params;
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Token required" },
        { status: 400 }
      );
    }

    // Verify token matches registration
    const regResult = await pool.query(
      `SELECT 
        r.id, r.status, r.position, r.checked_in_at, r.created_at, r.event_id, r.user_id,
        u.name as user_name,
        e.title as event_title, e.date as event_date, e.start_time, e.end_time,
        v.name as venue_name, v.address as venue_address, v.city as venue_city
       FROM registrations r
       JOIN events e ON r.event_id = e.id
       JOIN users u ON r.user_id = u.id
       LEFT JOIN venues v ON e.venue_id = v.id
       WHERE r.id = $1 AND r.token = $2`,
      [regId, token]
    );

    if (regResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Registration not found or invalid token" },
        { status: 404 }
      );
    }

    const registration = regResult.rows[0];

    // Fetch items with fixer info
    const itemsResult = await pool.query(
      `SELECT 
        i.id, i.name, i.status, i.queue_position,
        i.outcome, i.outcome_notes,
        u.name as fixer_name
       FROM items i
       LEFT JOIN users u ON i.fixer_id = u.id
       WHERE i.registration_id = $1
       ORDER BY i.queue_position NULLS LAST, i.created_at`,
      [regId]
    );

    // Calculate queue position
    // Count items with status='registered' that have earlier queue_position than this registration's items
    let queuePosition = 0;
    let queueTotal = 0;
    
    // Get items for checked-in attendees that are still waiting (not completed, not in-progress)
    const waitingItemsResult = await pool.query(
      `SELECT i.queue_position, i.status, r.id as reg_id
       FROM items i
       JOIN registrations r ON i.registration_id = r.id
       WHERE r.event_id = $1 AND r.status = 'checked_in'
         AND i.status IN ('queued', 'registered', 'fixer_assigned')
       ORDER BY i.queue_position NULLS LAST, i.created_at`,
      [registration.event_id]
    );

    // Total = items still waiting in queue (not in-progress, not completed)
    queueTotal = waitingItemsResult.rows.length;

    // Find this registration's items' queue positions
    const myItemPositions = itemsResult.rows
      .filter((item: { queue_position: number | null; status: string }) => item.queue_position !== null && ['queued', 'registered', 'fixer_assigned'].includes(item.status))
      .map((item: { queue_position: number }) => item.queue_position);

    if (myItemPositions.length > 0) {
      const minMyPosition = Math.min(...myItemPositions);
      // Count items ahead in queue (only queued/waiting, not in-progress or completed)
      queuePosition = waitingItemsResult.rows.filter(
        (item: { queue_position: number | null }) => 
          item.queue_position !== null && item.queue_position < minMyPosition
      ).length + 1;
    } else if (registration.status === 'checked_in' && queueTotal > 0) {
      queuePosition = queueTotal;
    }

    // Format response
    return NextResponse.json({
      success: true,
      registration: {
        status: registration.status,
        checked_in_at: registration.checked_in_at,
        user_name: registration.user_name,
      },
      event: {
        title: registration.event_title,
        date: registration.event_date,
        start_time: registration.start_time,
        end_time: registration.end_time,
        venue_name: registration.venue_name,
        venue_address: registration.venue_address 
          ? `${registration.venue_address}${registration.venue_city ? ', ' + registration.venue_city : ''}`
          : null,
      },
      items: itemsResult.rows.map((item: { 
        id: string; 
        name: string; 
        status: string; 
        outcome: string | null; 
        outcome_notes: string | null;
        fixer_name: string | null;
        queue_position: number | null;
      }) => ({
        id: item.id,
        name: item.name,
        status: item.status,
        outcome: item.outcome,
        outcome_notes: item.outcome_notes,
        fixer_name: item.fixer_name,
        queue_position: item.queue_position,
      })),
      queue_position: queuePosition,
      queue_total: queueTotal,
    });
  } catch (error) {
    console.error("Error fetching registration status:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch status" },
      { status: 500 }
    );
  }
}
