import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { requeueWaitingItems } from "@/lib/requeue";

// PATCH /api/admin/items/[id] - assign fixer / update status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: itemId } = await params;
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const userResult = await pool.query(
      `SELECT u.id, u.role FROM users u JOIN sessions s ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [sessionToken]
    );
    if (!userResult.rows[0] || userResult.rows[0].role !== "admin") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { fixer_id, status } = body;

    // If fixer_id is a volunteer id, resolve to users.id via email
    let resolvedFixerId = fixer_id;
    if (fixer_id) {
      const volResult = await pool.query(
        `SELECT u.id FROM volunteers v JOIN users u ON u.email = v.email WHERE v.id = $1`,
        [fixer_id]
      );
      if (volResult.rows[0]) {
        resolvedFixerId = volResult.rows[0].id;
      }
    }

    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (resolvedFixerId) {
      sets.push(`fixer_id = $${idx++}`);
      values.push(resolvedFixerId);
    }
    if (status) {
      sets.push(`status = $${idx++}`);
      values.push(status);
    }
    sets.push(`updated_at = NOW()`);

    values.push(itemId);
    await pool.query(
      `UPDATE items SET ${sets.join(", ")} WHERE id = $${idx}`,
      values
    );

    // Also populate item_fixers join table for multi-fixer support
    if (resolvedFixerId) {
      await pool.query(
        `INSERT INTO item_fixers (item_id, fixer_id, role, assigned_at)
         VALUES ($1, $2, 'primary', NOW())
         ON CONFLICT (item_id, fixer_id) DO NOTHING`,
        [itemId, resolvedFixerId]
      );
    }

    // Auto-requeue waiting items when completed
    if (status && ['completed', 'fixed', 'unfixable'].includes(status)) {
      requeueWaitingItems(itemId).catch(err => console.error('Requeue error:', err));
    }

    // "Almost your turn" email notifications when an item moves to in_progress
    if (status === "in_progress") {
      try {
        // Ensure the almost_notified column exists
        await pool.query(`ALTER TABLE items ADD COLUMN IF NOT EXISTS almost_notified boolean DEFAULT false`);

        // Get event_id of the updated item
        const itemRow = await pool.query(`SELECT event_id FROM items WHERE id = $1`, [itemId]);
        const eventId = itemRow.rows[0]?.event_id;

        if (eventId) {
          // Get next 2 queued items that haven't been notified
          const nextItems = await pool.query(`
            SELECT i.id, i.name, i.queue_position,
              SPLIT_PART(u.name, ' ', 1) as first_name,
              u.email as owner_email
            FROM items i
            JOIN registrations reg ON i.registration_id = reg.id
            JOIN users u ON reg.user_id = u.id
            WHERE i.event_id = $1 AND i.status = 'queued' AND (i.almost_notified IS NULL OR i.almost_notified = false)
            ORDER BY i.queue_position ASC NULLS LAST
            LIMIT 2
          `, [eventId]);

          for (let n = 0; n < nextItems.rows.length; n++) {
            const row = nextItems.rows[n];
            const position = n + 1;
            await sendEmail({
              to: row.owner_email,
              subject: "Almost your turn at London Repair Café!",
              text: `Hi ${row.first_name}, your ${row.name} is almost ready for repair! You're #${position} in the queue. Please make sure you're nearby so we can get started right away.`,
              html: `<p>Hi ${row.first_name},</p>
<p>Your <strong>${row.name}</strong> is almost ready for repair! You're #${position} in the queue.</p>
<p>Please make sure you're nearby so we can get started right away.</p>
<p>See you soon!</p>
<p>— London Repair Café Team</p>`,
            });
            await pool.query(`UPDATE items SET almost_notified = true WHERE id = $1`, [row.id]);
          }
        }
      } catch (emailErr) {
        console.error("Failed to send almost-your-turn emails:", emailErr);
      }
    }

    return NextResponse.json({ success: true, message: "Item updated" });
  } catch (error) {
    console.error("Error patching item:", error);
    return NextResponse.json({ success: false, message: "Failed to update item" }, { status: 500 });
  }
}

// PUT /api/admin/items/[id] - update an item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: itemId } = await params;
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const userResult = await pool.query(
      `SELECT u.id, u.role FROM users u JOIN sessions s ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [sessionToken]
    );
    if (!userResult.rows[0] || userResult.rows[0].role !== "admin") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { item_name, name: nameAlt, category, problem, description, status } = body;
    const itemName = item_name || nameAlt;

    const sets: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    if (itemName) { sets.push(`name = $${i++}`); vals.push(itemName); }
    if (category) { sets.push(`item_type = $${i++}`); vals.push(category); }
    if (problem !== undefined) { sets.push(`problem = $${i++}`); vals.push(problem); }
    if (description !== undefined) { sets.push(`description = $${i++}`); vals.push(description); }
    if (status) { sets.push(`status = $${i++}`); vals.push(status); }
    sets.push(`updated_at = NOW()`);
    vals.push(itemId);

    await pool.query(
      `UPDATE items SET ${sets.join(", ")} WHERE id = $${i}`,
      vals
    );

    // Auto-requeue waiting items when completed
    if (status && ['completed', 'fixed', 'unfixable'].includes(status)) {
      requeueWaitingItems(itemId).catch(err => console.error('Requeue error:', err));
    }

    return NextResponse.json({ success: true, message: "Item updated successfully" });
  } catch (error) {
    console.error("Error updating item:", error);
    return NextResponse.json({ success: false, message: "Failed to update item" }, { status: 500 });
  }
}

// DELETE /api/admin/items/[id] - delete an item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: itemId } = await params;
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const userResult = await pool.query(
      `SELECT u.id, u.role FROM users u JOIN sessions s ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [sessionToken]
    );
    if (!userResult.rows[0] || userResult.rows[0].role !== "admin") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    await pool.query("DELETE FROM items WHERE id = $1", [itemId]);

    return NextResponse.json({ success: true, message: "Item deleted successfully" });
  } catch (error) {
    console.error("Error deleting item:", error);
    return NextResponse.json({ success: false, message: "Failed to delete item" }, { status: 500 });
  }
}