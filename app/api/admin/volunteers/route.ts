import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

// Helper: verify admin auth
async function verifyAdminAuth() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return { authorized: false, user: null };
  }

  const userResult = await pool.query(
    `SELECT u.id, u.email, u.name, u.role
     FROM users u JOIN sessions s ON s.user_id = u.id
     WHERE s.token = $1 AND s.expires_at > NOW()`,
    [sessionToken]
  );

  const user = userResult.rows[0];
  if (!user || user.role !== "admin") {
    return { authorized: false, user: null };
  }

  return { authorized: true, user };
}

// GET /api/admin/volunteers - list volunteers with filters
export async function GET(request: NextRequest) {
  try {
    const { authorized, user } = await verifyAdminAuth();
    if (!authorized) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // all, pending, approved, rejected, archived
    const search = searchParams.get("search") || "";

    let query = `
      
      -- Get event for March 28, 2026
      WITH current_event AS (
        SELECT id 
        FROM events 
        WHERE date = '2026-03-28' 
        LIMIT 1
      ),
      
      -- Get RSVPs for this event
      volunteer_rsvps AS (
        SELECT 
          ver.volunteer_id,
          ver.response,
          ver.created_at as rsvp_created_at
        FROM volunteer_event_rsvps ver
        JOIN current_event ON ver.event_id = current_event.id
      )
      
      SELECT 
        v.id, 
        v.name, 
        v.email, 
        v.phone, 
        v.availability, 
        v.skills, 
        v.comments, 
        v.has_volunteered_before, 
        v.status, 
        v.is_fixer, 
        v.is_helper, 
        v.created_at, 
        v.updated_at,
        COALESCE(vr.response, 'hasn't responded') as rsvp_response,
        vr.rsvp_created_at as rsvp_created_at
      
      FROM volunteers v
      LEFT JOIN volunteer_rsvps vr ON v.id = vr.volunteer_id
      WHERE 1=1
      ORDER BY v.name ASC
    `;
    const params: any[] = [];

    // Filter by status
    if (status && status !== "all") {
      if (status === "archived") {
        query += ` AND status = 'archived'`;
      } else {
        params.push(status);
        query += ` AND status = $${params.length}`;
      }
    }

    // Search by name or email
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(email) LIKE $${params.length})`;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      volunteers: result.rows,
    });
  } catch (error) {
    console.error("Error fetching volunteers:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch volunteers" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/volunteers - update single volunteer
export async function PUT(request: NextRequest) {
  try {
    const { authorized, user } = await verifyAdminAuth();
    if (!authorized) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { volunteerId, name, email, phone, availability, skills, comments, hasVolunteeredBefore, status, isFixer, isHelper } = body;

    if (!volunteerId) {
      return NextResponse.json(
        { success: false, message: "volunteerId is required" },
        { status: 400 }
      );
    }

    // Build dynamic update query
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      params.push(name);
      updates.push(`name = $${paramIndex++}`);
    }
    if (email !== undefined) {
      params.push(email);
      updates.push(`email = $${paramIndex++}`);
    }
    if (phone !== undefined) {
      params.push(phone);
      updates.push(`phone = $${paramIndex++}`);
    }
    if (availability !== undefined) {
      params.push(availability);
      updates.push(`availability = $${paramIndex++}`);
    }
    if (skills !== undefined) {
      params.push(skills);
      updates.push(`skills = $${paramIndex++}`);
    }
    if (comments !== undefined) {
      params.push(comments);
      updates.push(`comments = $${paramIndex++}`);
    }
    if (hasVolunteeredBefore !== undefined) {
      params.push(hasVolunteeredBefore);
      updates.push(`has_volunteered_before = $${paramIndex++}`);
    }
    if (status !== undefined) {
      params.push(status);
      updates.push(`status = $${paramIndex++}`);
    }
    if (isFixer !== undefined) {
      params.push(isFixer);
      updates.push(`is_fixer = $${paramIndex++}`);
    }
    if (isHelper !== undefined) {
      params.push(isHelper);
      updates.push(`is_helper = $${paramIndex++}`);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, message: "No fields to update" },
        { status: 400 }
      );
    }

    params.push(volunteerId);
    const query = `UPDATE volunteers SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Volunteer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      volunteer: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating volunteer:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update volunteer" },
      { status: 500 }
    );
  }
}

// POST /api/admin/volunteers - bulk actions
export async function POST(request: NextRequest) {
  try {
    const { authorized, user } = await verifyAdminAuth();
    if (!authorized) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { volunteerIds, action } = body;

    if (!volunteerIds || !Array.isArray(volunteerIds) || volunteerIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "volunteerIds array is required" },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { success: false, message: "action is required" },
        { status: 400 }
      );
    }

    let query = "";
    const params = [volunteerIds];

    switch (action) {
      case "approve":
        query = `UPDATE volunteers SET status = 'approved', updated_at = NOW() WHERE id = ANY($1) RETURNING *`;
        break;
      case "reject":
        query = `UPDATE volunteers SET status = 'rejected', updated_at = NOW() WHERE id = ANY($1) RETURNING *`;
        break;
      case "archive":
        query = `UPDATE volunteers SET status = 'archived', updated_at = NOW() WHERE id = ANY($1) RETURNING *`;
        break;
      case "mark_fixer":
        query = `UPDATE volunteers SET is_fixer = true, updated_at = NOW() WHERE id = ANY($1) RETURNING *`;
        break;
      case "mark_helper":
        query = `UPDATE volunteers SET is_helper = true, updated_at = NOW() WHERE id = ANY($1) RETURNING *`;
        break;
      case "remove_fixer":
        query = `UPDATE volunteers SET is_fixer = false, updated_at = NOW() WHERE id = ANY($1) RETURNING *`;
        break;
      case "remove_helper":
        query = `UPDATE volunteers SET is_helper = false, updated_at = NOW() WHERE id = ANY($1) RETURNING *`;
        break;
      default:
        return NextResponse.json(
          { success: false, message: "Invalid action" },
          { status: 400 }
        );
    }

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      message: `${result.rows.length} volunteer(s) ${action}ed successfully`,
      updatedCount: result.rows.length,
    });
  } catch (error) {
    console.error("Error performing bulk action:", error);
    return NextResponse.json(
      { success: false, message: "Failed to perform bulk action" },
      { status: 500 }
    );
  }
}
