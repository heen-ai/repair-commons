import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const eventResult = await pool.query(
    `SELECT e.id, e.title, e.date, COALESCE(v.name, '') as location
     FROM events e LEFT JOIN venues v ON e.venue_id = v.id WHERE e.id = $1`,
    [eventId]
  );
  if (eventResult.rowCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const inProgressResult = await pool.query(`
    SELECT i.name as item_name, SPLIT_PART(u.name, ' ', 1) as owner_first_name,
      COALESCE(ifx.name, fv.name) as fixer_name
    FROM items i
    JOIN registrations reg ON i.registration_id = reg.id
    JOIN users u ON reg.user_id = u.id
    LEFT JOIN item_fixers ifs ON ifs.item_id = i.id AND ifs.role = 'primary'
    LEFT JOIN volunteers ifx ON ifx.id = ifs.fixer_id
    LEFT JOIN users fu ON i.fixer_id = fu.id
    LEFT JOIN volunteers fv ON LOWER(fv.email) = LOWER(fu.email)
    WHERE i.event_id = $1 AND i.status = 'in_progress'
    ORDER BY i.updated_at DESC
  `, [eventId]);

  const upNextResult = await pool.query(`
    SELECT i.name as item_name, i.queue_position, SPLIT_PART(u.name, ' ', 1) as owner_first_name
    FROM items i
    JOIN registrations reg ON i.registration_id = reg.id
    JOIN users u ON reg.user_id = u.id
    WHERE i.event_id = $1 AND i.status = 'queued'
    ORDER BY i.queue_position ASC NULLS LAST
    LIMIT 8
  `, [eventId]);

  const statsResult = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM registrations WHERE event_id = $1 AND status = 'checked_in') as checked_in,
      COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
      COUNT(*) FILTER (WHERE status IN ('fixed', 'unfixable')) as completed,
      COUNT(*) FILTER (WHERE status = 'fixed') as fixed
    FROM items WHERE event_id = $1 AND status != 'cancelled'
  `, [eventId]);

  return NextResponse.json({
    event: eventResult.rows[0],
    in_progress: inProgressResult.rows,
    up_next: upNextResult.rows,
    stats: statsResult.rows[0]
  });
}
