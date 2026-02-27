import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, availability, comments, hasVolunteeredBefore, roles } = body;

    // Validation
    if (!name || !email) {
      return NextResponse.json(
        { success: false, message: "Name and email are required" },
        { status: 400 }
      );
    }

    // Insert into database
    const result = await pool.query(
      `INSERT INTO helpers (name, email, phone, availability, comments, has_volunteered_before, roles, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING *`,
      [
        name,
        email,
        phone || null,
        availability || null,
        comments || null,
        hasVolunteeredBefore || false,
        roles || [],
      ]
    );

    return NextResponse.json({
      success: true,
      message: "Registration submitted successfully! We'll be in touch soon.",
      helper: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating helper registration:", error);
    return NextResponse.json(
      { success: false, message: "Failed to submit registration" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  // This endpoint is protected - only admins can access it
  // The admin page will handle auth check
  try {
    const { searchParams } = new URL(request.url);
    const admin = searchParams.get("admin") === "true";

    if (!admin) {
      // Public shouldn't see all helpers
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const result = await pool.query(
      `SELECT * FROM helpers ORDER BY created_at DESC`
    );

    return NextResponse.json({
      success: true,
      helpers: result.rows,
    });
  } catch (error) {
    console.error("Error fetching helpers:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch helpers" },
      { status: 500 }
    );
  }
}
