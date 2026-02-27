import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { registration_id, fixer_id, age_group, gender, gender_self_describe, newcomer_to_canada } = body;

    // Validate that we have either a registration_id or fixer_id
    if (!registration_id && !fixer_id) {
      return NextResponse.json(
        { success: false, message: "registration_id or fixer_id is required" },
        { status: 400 }
      );
    }

    // Check if demographics already exist for this registration/fixer
    let existing = null;
    if (registration_id) {
      const existingResult = await pool.query(
        "SELECT id FROM registration_demographics WHERE registration_id = $1",
        [registration_id]
      );
      if (existingResult.rows.length > 0) {
        existing = existingResult.rows[0].id;
      }
    } else if (fixer_id) {
      const existingResult = await pool.query(
        "SELECT id FROM registration_demographics WHERE fixer_id = $1",
        [fixer_id]
      );
      if (existingResult.rows.length > 0) {
        existing = existingResult.rows[0].id;
      }
    }

    let result;
    if (existing) {
      // Update existing
      result = await pool.query(
        `UPDATE registration_demographics 
         SET age_group = $1, gender = $2, gender_self_describe = $3, newcomer_to_canada = $4
         WHERE id = $5
         RETURNING *`,
        [age_group, gender, gender_self_describe, newcomer_to_canada, existing]
      );
    } else {
      // Insert new
      result = await pool.query(
        `INSERT INTO registration_demographics 
         (registration_id, fixer_id, age_group, gender, gender_self_describe, newcomer_to_canada)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [registration_id || null, fixer_id || null, age_group, gender, gender_self_describe, newcomer_to_canada]
      );
    }

    return NextResponse.json({
      success: true,
      demographics: result.rows[0],
    }, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error("Error saving demographics:", error);
    return NextResponse.json(
      { success: false, message: "Failed to save demographics" },
      { status: 500 }
    );
  }
}
