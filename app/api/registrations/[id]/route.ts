import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAuth, SESSION_COOKIE_NAME } from "@/lib/auth";

// GET /api/registrations/[id] - fetch registration with items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: regId } = await params;
    const token = request.nextUrl.searchParams.get("token");
    
    // Get session from cookie
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    
    // Query registration
    const regResult = await pool.query(
      `SELECT 
        r.id, r.status, r.position, r.qr_code, r.checked_in_at, r.created_at,
        r.event_id,
        e.title as event_title, e.date as event_date, e.start_time, e.end_time,
        v.name as venue_name, v.address as venue_address, v.city as venue_city,
        u.id as user_id, u.email, u.name as user_name
       FROM registrations r
       JOIN events e ON r.event_id = e.id
       LEFT JOIN venues v ON e.venue_id = v.id
       JOIN users u ON r.user_id = u.id
       WHERE r.id = $1`,
      [regId]
    );

    if (regResult.rows.length === 0) {
      return NextResponse.json({ success: false, message: "Registration not found" }, { status: 404 });
    }

    const registration = regResult.rows[0];

    // Check authorization: session matches user_id OR valid token in URL
    let authorized = false;
    if (sessionToken) {
      const sessionResult = await pool.query(
        `SELECT u.id FROM users u 
         JOIN sessions s ON s.user_id = u.id 
         WHERE s.token = $1 AND s.expires_at > NOW()`,
        [sessionToken]
      );
      if (sessionResult.rows.length > 0 && sessionResult.rows[0].id === registration.user_id) {
        authorized = true;
      }
    }
    
    // Also check if token in URL matches (for email links)
    if (!authorized && token) {
      const tokenResult = await pool.query(
        "SELECT id FROM registrations WHERE id = $1 AND token = $2",
        [regId, token]
      );
      if (tokenResult.rows.length > 0) {
        authorized = true;
      }
    }

    if (!authorized) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // Fetch items
    const itemsResult = await pool.query(
      `SELECT id, name, problem, status, queue_position, fixer_id
       FROM items 
       WHERE registration_id = $1`,
      [regId]
    );

    // If no token in URL, generate a management token for this session
    let managementToken = token;
    if (!managementToken) {
      const crypto = await import("crypto");
      managementToken = crypto.randomBytes(16).toString("hex");
      await pool.query(
        "UPDATE registrations SET token = $1 WHERE id = $2",
        [managementToken, regId]
      );
    }

    return NextResponse.json({
      success: true,
      registration: {
        ...registration,
        items: itemsResult.rows,
      },
      managementToken,
    });
  } catch (error) {
    console.error("Error fetching registration:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch registration" }, { status: 500 });
  }
}

// PATCH /api/registrations/[id] - update items
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: regId } = await params;
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const token = request.nextUrl.searchParams.get("token");

    if (!sessionToken && !token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    let userId = null;
    if (sessionToken) {
      const sessionResult = await pool.query(
        `SELECT u.id FROM users u 
         JOIN sessions s ON s.user_id = u.id 
         WHERE s.token = $1 AND s.expires_at > NOW()`,
        [sessionToken]
      );
      if (sessionResult.rows.length > 0) {
        userId = sessionResult.rows[0].id;
      }
    }

    // Check token if no session
    if (!userId && token) {
      const tokenResult = await pool.query(
        "SELECT user_id FROM registrations WHERE id = $1 AND token = $2",
        [regId, token]
      );
      if (tokenResult.rows.length > 0) {
        userId = tokenResult.rows[0].user_id;
      }
    }

    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // Verify registration belongs to user
    const regCheck = await pool.query(
      "SELECT id, status, event_id FROM registrations WHERE id = $1 AND user_id = $2",
      [regId, userId]
    );

    if (regCheck.rows.length === 0) {
      return NextResponse.json({ success: false, message: "Registration not found" }, { status: 404 });
    }

    if (regCheck.rows[0].status === "cancelled") {
      return NextResponse.json({ success: false, message: "Registration is cancelled" }, { status: 400 });
    }

    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ success: false, message: "Items array required" }, { status: 400 });
    }

    // Delete existing items and insert new ones
    await pool.query("DELETE FROM items WHERE registration_id = $1", [regId]);

    const insertedItems = [];
    for (const item of items) {
      if (item.name && item.problem) {
        const result = await pool.query(
          `INSERT INTO items (registration_id, user_id, event_id, name, problem, status)
           VALUES ($1, $2, $3, $4, $5, 'registered') RETURNING *`,
          [regId, userId, regCheck.rows[0].event_id, item.name, item.problem]
        );
        insertedItems.push(result.rows[0]);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Items updated",
      items: insertedItems,
    });
  } catch (error) {
    console.error("Error updating registration:", error);
    return NextResponse.json({ success: false, message: "Failed to update registration" }, { status: 500 });
  }
}

// DELETE /api/registrations/[id] - cancel registration
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: regId } = await params;
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const token = request.nextUrl.searchParams.get("token");

    if (!sessionToken && !token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    let userId = null;
    if (sessionToken) {
      const sessionResult = await pool.query(
        `SELECT u.id FROM users u 
         JOIN sessions s ON s.user_id = u.id 
         WHERE s.token = $1 AND s.expires_at > NOW()`,
        [sessionToken]
      );
      if (sessionResult.rows.length > 0) {
        userId = sessionResult.rows[0].id;
      }
    }

    // Check token if no session
    if (!userId && token) {
      const tokenResult = await pool.query(
        "SELECT user_id FROM registrations WHERE id = $1 AND token = $2",
        [regId, token]
      );
      if (tokenResult.rows.length > 0) {
        userId = tokenResult.rows[0].user_id;
      }
    }

    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // Verify registration belongs to user
    const regCheck = await pool.query(
      "SELECT id, status, event_id FROM registrations WHERE id = $1 AND user_id = $2",
      [regId, userId]
    );

    if (regCheck.rows.length === 0) {
      return NextResponse.json({ success: false, message: "Registration not found" }, { status: 404 });
    }

    // Cancel registration
    await pool.query(
      "UPDATE registrations SET status = 'cancelled', updated_at = NOW() WHERE id = $1",
      [regId]
    );

    // Update items status
    await pool.query(
      "UPDATE items SET status = 'cancelled' WHERE registration_id = $1",
      [regId]
    );

    return NextResponse.json({
      success: true,
      message: "Registration cancelled",
    });
  } catch (error) {
    console.error("Error cancelling registration:", error);
    return NextResponse.json({ success: false, message: "Failed to cancel registration" }, { status: 500 });
  }
}
