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
      u.id as fixer_id, v.name, fer.table_number,
      fer.ready_for_next,
      COUNT(i.id) FILTER (WHERE i.status = 'in_progress') as items_in_progress,
      COUNT(i.id) FILTER (WHERE i.status IN ('fixed', 'unfixable', 'completed')) as items_completed
    FROM fixer_event_rsvps fer
    JOIN users u ON fer.fixer_id = u.id
    JOIN volunteers v ON LOWER(v.email) = LOWER(u.email) AND v.status = 'approved'
    LEFT JOIN items i ON i.fixer_id = u.id AND i.event_id = $1
    WHERE fer.event_id = $1 AND fer.checked_in_at IS NOT NULL
    GROUP BY u.id, v.name, fer.table_number, fer.ready_for_next
    ORDER BY v.name
  `, [eventId]);

  const itemsResult = await pool.query(`
    SELECT
      i.id, i.name, i.problem, i.status, i.queue_position, i.item_type,
      u.name as owner_name,
      fu.id as fixer_user_id, fv.name as fixer_name,
      CASE WHEN i.no_phone = true THEN false ELSE true END as has_phone,
      (SELECT COUNT(*) FROM fixer_interest fi WHERE fi.item_id = i.id) as interest_count,
      (SELECT string_agg(v2.name, ', ') FROM fixer_interest fi2 JOIN users fu2 ON fi2.fixer_id = fu2.id LEFT JOIN volunteers v2 ON LOWER(v2.email) = LOWER(fu2.email) WHERE fi2.item_id = i.id) as interested_fixers
    FROM items i
    JOIN registrations reg ON i.registration_id = reg.id
    JOIN users u ON reg.user_id = u.id
    LEFT JOIN users fu ON i.fixer_id = fu.id
    LEFT JOIN volunteers fv ON fv.email = fu.email
    WHERE i.event_id = $1 AND i.status NOT IN ('cancelled')
      AND reg.status = 'checked_in'
    ORDER BY i.queue_position ASC NULLS LAST, i.created_at ASC
  `, [eventId]);

  const statsResult = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE i.status IN ('queued', 'registered')) as queued,
      COUNT(*) FILTER (WHERE i.status = 'in_progress') as in_progress,
      COUNT(*) FILTER (WHERE i.status IN ('fixed', 'unfixable', 'completed')) as completed
    FROM items i
    JOIN registrations reg ON i.registration_id = reg.id
    WHERE i.event_id = $1 AND i.status != 'cancelled' AND reg.status = 'checked_in'
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
