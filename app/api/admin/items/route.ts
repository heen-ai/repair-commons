import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

// GET /api/admin/items - list all items
export async function GET(request: NextRequest) {
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

    const itemsResult = await pool.query(`
      SELECT i.id, i.name as item_name, i.item_type as category, i.problem, i.description, 
             i.status, i.created_at,
             e.title as event_title, e.date as event_date,
             u.name as owner_name, u.email as owner_email,
             CASE WHEN fi.fixer_id IS NOT NULL THEN uf.name ELSE NULL END as fixer_name
      FROM items i
      JOIN events e ON i.event_id = e.id
      LEFT JOIN users u ON i.user_id = u.id
      LEFT JOIN fixer_interest fi ON i.id = fi.item_id
      LEFT JOIN users uf ON fi.fixer_id = uf.id
      ORDER BY e.date DESC, i.created_at DESC
    `);

    return NextResponse.json({ success: true, items: itemsResult.rows });
  } catch (error) {
    console.error("Error fetching items:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch items" }, { status: 500 });
  }
}