import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

// GET /api/admin/fixers - list all fixers
export async function GET(request: NextRequest) {
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

    // Get all fixers with their skills and event history
    const fixersResult = await pool.query(
      `SELECT 
        f.id, f.name, f.email, f.phone, f.skills, f.bio, f.availability, 
        f.comments, f.status, f.approved_at, f.created_at,
        (SELECT COUNT(*) FROM fixer_event_rsvps fer 
         JOIN events e ON fer.event_id = e.id 
         WHERE fer.fixer_id = f.id AND e.date >= CURRENT_DATE) as upcoming_events_count
       FROM fixers f
       ORDER BY f.created_at DESC`
    );

    // Get skills for each fixer
    const fixers = fixersResult.rows;
    
    // Fetch user skills for each fixer
    for (const fixer of fixers) {
      const skillsResult = await pool.query(
        `SELECT s.id, s.name, s.category 
         FROM skills s
         JOIN user_skills us ON us.skill_id = s.id
         JOIN users u ON u.email = f.email
         WHERE u.id = us.user_id`
      );
      fixer.userSkills = skillsResult.rows;
    }

    return NextResponse.json({
      success: true,
      fixers,
    });
  } catch (error) {
    console.error("Error fetching fixers:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch fixers" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/fixers - approve/reject fixer
export async function PATCH(request: NextRequest) {
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
    const { fixerId, action } = body;

    if (!fixerId || !action) {
      return NextResponse.json(
        { success: false, message: "fixerId and action are required" },
        { status: 400 }
      );
    }

    if (action === "approve") {
      await pool.query(
        `UPDATE fixers SET status = 'active', approved_at = NOW() WHERE id = $1`,
        [fixerId]
      );
    } else if (action === "reject") {
      await pool.query(
        `UPDATE fixers SET status = 'rejected', approved_at = NULL WHERE id = $1`,
        [fixerId]
      );
    } else if (action === "remove") {
      await pool.query(
        `UPDATE fixers SET status = 'removed', approved_at = NULL WHERE id = $1`,
        [fixerId]
      );
    } else {
      return NextResponse.json(
        { success: false, message: "Invalid action" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Fixer ${action}ed successfully`,
    });
  } catch (error) {
    console.error("Error updating fixer:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update fixer" },
      { status: 500 }
    );
  }
}
