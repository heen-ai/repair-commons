import pool from "@/lib/db";

/**
 * When an item is completed/fixed/unfixable, check if the same registration
 * has 'waiting' items. If so, queue the next one at the back of the queue.
 */
export async function requeueWaitingItems(itemId: string) {
  // Get the registration for this item
  const itemResult = await pool.query(
    `SELECT i.registration_id, i.event_id FROM items i WHERE i.id = $1`,
    [itemId]
  );
  if (itemResult.rows.length === 0) return;
  const { registration_id, event_id } = itemResult.rows[0];

  // Check if there are waiting items for this registration
  const waitingResult = await pool.query(
    `SELECT id FROM items WHERE registration_id = $1 AND status = 'waiting' ORDER BY created_at LIMIT 1`,
    [registration_id]
  );
  if (waitingResult.rows.length === 0) return;

  const nextItemId = waitingResult.rows[0].id;

  // Get next queue position
  const maxPos = await pool.query(
    `SELECT COALESCE(MAX(i.queue_position), 0) as max_pos
     FROM items i JOIN registrations r ON i.registration_id = r.id WHERE r.event_id = $1`,
    [event_id]
  );
  const nextPos = (maxPos.rows[0]?.max_pos || 0) + 1;

  // Queue the next waiting item at the back
  await pool.query(
    `UPDATE items SET status = 'queued', queue_position = $1 WHERE id = $2`,
    [nextPos, nextItemId]
  );

  console.log(`Auto-requeued item ${nextItemId} at position ${nextPos} for registration ${registration_id}`);
}
