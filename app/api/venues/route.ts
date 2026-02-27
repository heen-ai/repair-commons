import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT id, name, address, city FROM venues ORDER BY name`
    );

    return NextResponse.json({
      success: true,
      venues: result.rows,
    });
  } catch (error) {
    console.error("Error fetching venues:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch venues" },
      { status: 500 }
    );
  }
}
