import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

// DELETE /api/admin/items/bulk - delete multiple items
export async function DELETE(request: NextRequest) {
  try {
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

    const { itemIds } = await request.json();
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ success: false, message: "No items selected" }, { status: 400 });
    }

    // Delete items
    const placeholders = itemIds.map((_, i) => `$${i + 1}`).join(',');
    const result = await pool.query(
      `DELETE FROM items WHERE id IN (${placeholders})`,
      itemIds
    );

    const deletedCount = result.rowCount || 0;

    return NextResponse.json({ 
      success: true, 
      message: `Successfully deleted ${deletedCount} item${deletedCount === 1 ? '' : 's'}` 
    });
  } catch (error) {
    console.error("Error bulk deleting items:", error);
    return NextResponse.json({ success: false, message: "Failed to delete items" }, { status: 500 });
  }
}

// PATCH /api/admin/items/bulk - update multiple items (e.g., status changes)
export async function PATCH(request: NextRequest) {
  try {
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

    const { itemIds, updates } = await request.json();
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ success: false, message: "No items selected" }, { status: 400 });
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ success: false, message: "No updates provided" }, { status: 400 });
    }

    // Build update query
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (updates.status) {
      updateFields.push(`status = $${paramIndex++}`);
      updateValues.push(updates.status);
    }
    if (updates.item_type) {
      updateFields.push(`item_type = $${paramIndex++}`);
      updateValues.push(updates.item_type);
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ success: false, message: "No valid updates provided" }, { status: 400 });
    }

    updateFields.push(`updated_at = NOW()`);
    
    const placeholders = itemIds.map((_, i) => `$${paramIndex + i}`).join(',');
    updateValues.push(...itemIds);

    const query = `UPDATE items SET ${updateFields.join(', ')} WHERE id IN (${placeholders})`;
    const result = await pool.query(query, updateValues);

    const updatedCount = result.rowCount || 0;

    return NextResponse.json({ 
      success: true, 
      message: `Successfully updated ${updatedCount} item${updatedCount === 1 ? '' : 's'}` 
    });
  } catch (error) {
    console.error("Error bulk updating items:", error);
    return NextResponse.json({ success: false, message: "Failed to update items" }, { status: 500 });
  }
}