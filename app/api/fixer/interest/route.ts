import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import pool from "@/lib/db";

// POST /api/fixer/interest - express interest in fixing an item
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { itemId, notes, suggestedParts, questions } = body;

    if (!itemId) {
      return NextResponse.json(
        { success: false, message: "itemId is required" },
        { status: 400 }
      );
    }

    // Check if item exists
    const itemResult = await pool.query(
      "SELECT id, status FROM items WHERE id = $1",
      [itemId]
    );

    if (itemResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Item not found" },
        { status: 404 }
      );
    }

    if (itemResult.rows[0].status === "completed" || itemResult.rows[0].status === "cancelled") {
      return NextResponse.json(
        { success: false, message: "This item is no longer available" },
        { status: 400 }
      );
    }

    // Check if already interested
    const existingInterest = await pool.query(
      "SELECT id FROM fixer_interest WHERE item_id = $1 AND fixer_id = $2",
      [itemId, user.id]
    );

    if (existingInterest.rows.length > 0) {
      // Update existing interest
      await pool.query(
        `UPDATE fixer_interest 
         SET notes = $1, suggested_parts = $2, questions = $3
         WHERE id = $4`,
        [notes || null, suggestedParts || null, questions || null, existingInterest.rows[0].id]
      );

      return NextResponse.json({
        success: true,
        message: "Interest updated successfully",
      });
    }

    // Create new interest
    const result = await pool.query(
      `INSERT INTO fixer_interest (item_id, fixer_id, notes, suggested_parts, questions)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [itemId, user.id, notes || null, suggestedParts || null, questions || null]
    );

    // Update item status to indicate a fixer is interested
    await pool.query(
      "UPDATE items SET status = 'fixer_assigned' WHERE id = $1",
      [itemId]
    );

    return NextResponse.json({
      success: true,
      message: "Interest expressed successfully!",
      interestId: result.rows[0].id,
    });
  } catch (error) {
    console.error("Error expressing interest:", error);
    return NextResponse.json(
      { success: false, message: "Failed to express interest" },
      { status: 500 }
    );
  }
}
