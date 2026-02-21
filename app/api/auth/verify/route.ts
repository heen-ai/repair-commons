import { NextRequest, NextResponse } from "next/server";
import { verifyMagicLink, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const token = new URL(request.url).searchParams.get("token");
    if (!token) {
      return NextResponse.json({ success: false, message: "Token is required" }, { status: 400 });
    }

    const result = await verifyMagicLink(token);
    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 });
    }

    const response = NextResponse.json({ success: true, user: result.user });
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
  } catch (error) {
    console.error("Error verifying:", error);
    return NextResponse.json({ success: false, message: "Verification failed" }, { status: 500 });
  }
}
