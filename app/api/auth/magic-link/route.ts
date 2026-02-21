import { NextRequest, NextResponse } from "next/server";
import { requestMagicLink } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.email) {
      return NextResponse.json({ success: false, message: "Email is required" }, { status: 400 });
    }

    const result = await requestMagicLink(body.email, {
      name: body.name,
      baseUrl: process.env.APP_URL,
    });

    const response: Record<string, unknown> = { success: true, message: "Magic link sent to your email" };
    if (process.env.NODE_ENV === "development") {
      response.debug = { token: result.token, magicLinkUrl: result.magicLinkUrl };
    }
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error requesting magic link:", error);
    return NextResponse.json({ success: false, message: "Failed to send magic link" }, { status: 500 });
  }
}
