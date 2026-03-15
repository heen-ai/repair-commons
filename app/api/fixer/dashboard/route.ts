import { NextRequest, NextResponse } from "next/server";

// Deprecated - use /api/volunteer/dashboard
export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/api/volunteer/dashboard", request.url));
}
