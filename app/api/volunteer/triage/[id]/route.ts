import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

async function verifyVolunteerAuth() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) return null;

  const userResult = await pool.query(
    `SELECT u.id, u.email, u.name, u.role FROM users u JOIN sessions s ON s.user_id = u.id
     WHERE s.token = $1 AND s.expires_at > NOW()`,
    [sessionToken]
  );
  const user = userResult.rows[0];
  if (!user) return null;

  // Check if admin, helper, or fixer
  if (user.role === "admin") return user;

  const volResult = await pool.query(
    `SELECT is_helper, is_fixer FROM volunteers WHERE LOWER(email) = LOWER($1) AND status = 'approved'`,
    [user.email]
  );
  if (volResult.rows[0]?.is_helper || volResult.rows[0]?.is_fixer) return user;

  return null;
}

// GET /api/volunteer/triage/[id] - get triage data (same as admin but helper-accessible)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyVolunteerAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;

  const fixersResult = await pool.query(`
    SELECT
      v.id as fixer_id, v.name, fer.table_number,
      COUNT(i.id) FILTER (WHERE i.status = 'in_progress') as items_in_progress
    FROM volunteers v
    JOIN fixer_event_rsvps fer ON fer.fixer_id = v.id AND fer.event_id = $1
    JOIN users u ON u.email = v.email
    LEFT JOIN items i ON i.fixer_id = u.id AND i.event_id = $1
    WHERE fer.checked_in_at IS NOT NULL
    GROUP BY v.id, v.name, fer.table_number
    ORDER BY v.name
  `, [eventId]);

  const itemsResult = await pool.query(`
    SELECT
      i.id, i.name, i.problem, i.status, i.queue_position,
      u.name as owner_name,
      fu.id as fixer_user_id, fv.name as fixer_name,
      CASE WHEN i.no_phone = true OR u.email LIKE 'walkin-%' THEN false ELSE true END as has_phone
    FROM items i
    JOIN registrations reg ON i.registration_id = reg.id
    JOIN users u ON reg.user_id = u.id
    LEFT JOIN users fu ON i.fixer_id = fu.id
    LEFT JOIN volunteers fv ON fv.email = fu.email
    WHERE i.event_id = $1 AND i.status NOT IN ('cancelled')
    ORDER BY i.queue_position ASC NULLS LAST, i.created_at ASC
  `, [eventId]);

  const statsResult = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE status IN ('queued', 'registered')) as queued,
      COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
      COUNT(*) FILTER (WHERE status IN ('fixed', 'unfixable', 'completed')) as completed
    FROM items WHERE event_id = $1 AND status != 'cancelled'
  `, [eventId]);

  return NextResponse.json({
    fixers_present: fixersResult.rows,
    queue_items: itemsResult.rows,
    stats: {
      fixers_present: fixersResult.rows.length,
      ...statsResult.rows[0]
    }
  });
}
