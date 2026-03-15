import { NextRequest, NextResponse } from "next/server";
import { verifyMagicLink, SESSION_COOKIE_NAME } from "@/lib/auth";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(`${process.env.APP_URL}/auth/signin?error=no-token`);
  }

  const result = await verifyMagicLink(token);
  if (!result.success) {
    const errorMsg = result.message || "Unknown error";
    return NextResponse.redirect(`${process.env.APP_URL}/auth/signin?error=${encodeURIComponent(errorMsg)}`);
  }

  // Check if volunteer - redirect to dashboard
  let redirectTo = "/dashboard";
  if (result.user?.email) {
    const volCheck = await pool.query(
      "SELECT id FROM volunteers WHERE LOWER(email) = LOWER($1)", [result.user.email]
    );
    if (volCheck.rows.length > 0) {
      redirectTo = "/volunteer/dashboard";
    }
  }

  const response = NextResponse.redirect(`${process.env.APP_URL}${redirectTo}`);
  if (result.sessionToken) {
    response.cookies.set(SESSION_COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });
  }
  return response;
}
