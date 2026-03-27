import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

// GET /api/checkout/[itemId] - get item data for checkout
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;

    const result = await pool.query(`
      SELECT 
        i.id, i.name, i.problem, i.status,
        u.name as owner_name,
        fv.name as fixer_name
      FROM items i
      JOIN registrations reg ON i.registration_id = reg.id
      JOIN users u ON reg.user_id = u.id
      LEFT JOIN users fu ON i.fixer_id = fu.id
      LEFT JOIN volunteers fv ON fv.email = fu.email
      WHERE i.id = $1
    `, [itemId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, message: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, item: result.rows[0] });
  } catch (error) {
    console.error("Checkout GET error:", error);
    return NextResponse.json({ success: false, message: "Failed to load item" }, { status: 500 });
  }
}

// POST /api/checkout/[itemId] - submit checkout data
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const body = await req.json();
    const {
      outcome,
      learnings,
      repair_notes,
      weight_kg,
      pct_electronic,
      pct_metal,
      pct_plastic,
      pct_textile,
      pct_other,
      material_other_desc,
      repair_photos,
    } = body;

    if (!outcome) {
      return NextResponse.json({ success: false, message: "Outcome is required" }, { status: 400 });
    }

    // Map outcome to status
    const statusMap: Record<string, string> = {
      fixed: "fixed",
      partial: "partial_fix",
      not_fixed: "unfixable",
    };
    const newStatus = statusMap[outcome] || "completed";

    // Update item
    await pool.query(`
      UPDATE items SET
        status = $1,
        outcome = $2,
        learnings = $3,
        repair_notes = COALESCE($4, repair_notes),
        weight_kg = COALESCE($5, weight_kg),
        pct_electronic = COALESCE($6, pct_electronic),
        pct_metal = COALESCE($7, pct_metal),
        pct_plastic = COALESCE($8, pct_plastic),
        pct_textile = COALESCE($9, pct_textile),
        pct_other = COALESCE($10, pct_other),
        material_other_desc = COALESCE($11, material_other_desc),
        repair_photos = CASE 
          WHEN $12::jsonb IS NOT NULL AND jsonb_array_length($12::jsonb) > 0 
          THEN COALESCE(repair_photos, '[]'::jsonb) || $12::jsonb
          ELSE repair_photos 
        END,
        repair_completed_at = NOW(),
        updated_at = NOW()
      WHERE id = $13
    `, [
      newStatus, outcome, learnings, repair_notes,
      weight_kg, pct_electronic, pct_metal, pct_plastic, pct_textile, pct_other,
      material_other_desc,
      repair_photos && repair_photos.length > 0 ? JSON.stringify(repair_photos) : null,
      itemId,
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Checkout POST error:", error);
    return NextResponse.json({ success: false, message: "Failed to save checkout" }, { status: 500 });
  }
}
