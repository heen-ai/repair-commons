import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    
    if (user) {
      const volCheck = await pool.query(
        "SELECT id, is_helper, is_fixer FROM volunteers WHERE LOWER(email) = LOWER($1)",
        [user.email]
      );

      const vol = volCheck.rows[0];
      const isFixer = vol?.is_fixer === true;
      const isHelper = vol?.is_helper === true;
      const isAdmin = user.role === "admin";

      return NextResponse.json({ 
        authenticated: true, 
        user: { 
          id: user.id, 
          email: user.email, 
          name: user.name, 
          role: user.role,
          isFixer,
          isHelper,
          isAdmin,
          isVolunteer: isFixer || isHelper,
        } 
      });
    }
    
    return NextResponse.json({ authenticated: false });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json({ authenticated: false });
  }
}
