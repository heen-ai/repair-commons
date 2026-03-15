import { NextRequest, NextResponse } from "next/server";

// Deprecated - redirects to /api/volunteer/events
export async function POST(request: NextRequest) {
  // Forward to the unified volunteer events endpoint
  const url = new URL("/api/volunteer/events", request.url);
  const res = await fetch(url, {
    method: "POST",
    headers: request.headers,
    body: await request.text(),
  });
  return new NextResponse(res.body, { status: res.status, headers: res.headers });
}
