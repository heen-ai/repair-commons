import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

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
    const { item_name, category, problem, description, status } = body;

    await pool.query(
      `UPDATE items 
       SET name = $1, item_type = $2, problem = $3, description = $4, status = $5, updated_at = NOW()
       WHERE id = $6`,
      [item_name, category, problem, description, status, itemId]
    );

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