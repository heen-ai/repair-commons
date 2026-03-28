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

  // Smart redirect based on role + whether there's an active event (within 1hr before/after)
  let redirectTo = "/dashboard";
  if (result.user?.email) {
    const volCheck = await pool.query(
      "SELECT id, is_fixer, is_helper FROM volunteers WHERE LOWER(email) = LOWER($1) AND status = 'approved'",
      [result.user.email]
    );
    const vol = volCheck.rows[0];

    if (vol) {
      // Check for an active event (starts within 1hr ago to 1hr from now, or is today)
      const activeEvent = await pool.query(`
        SELECT id FROM events
        WHERE date >= CURRENT_DATE
        AND date <= CURRENT_DATE + INTERVAL '1 day'
        ORDER BY date ASC LIMIT 1
      `);
      const eventId = activeEvent.rows[0]?.id;

      if (eventId && vol.is_fixer) {
        // Auto-create fixer_event_rsvps + check in
        await pool.query(
          `INSERT INTO fixer_event_rsvps (fixer_id, event_id, status, checked_in_at)
           VALUES ($1, $2, 'confirmed', NOW())
           ON CONFLICT (fixer_id, event_id) DO UPDATE SET checked_in_at = COALESCE(fixer_event_rsvps.checked_in_at, NOW())`,
          [result.user!.id, eventId]
        );
        // Fixer on event day → name card page
        redirectTo = `/fixer/events/${eventId}/my-work`;
      } else if (eventId && vol.is_helper) {
        // Helper on event day → triage screen
        redirectTo = `/volunteer/triage/${eventId}`;
      } else {
        redirectTo = "/volunteer/dashboard";
      }
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
