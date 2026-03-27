import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
      fu.id as fixer_user_id, fv.name as fixer_name
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
      COUNT(*) FILTER (WHERE status = 'queued') as queued,
      COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
      COUNT(*) FILTER (WHERE status IN ('fixed', 'unfixable')) as completed
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
