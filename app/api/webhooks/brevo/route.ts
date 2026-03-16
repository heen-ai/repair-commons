/**
 * Brevo Webhook Endpoint
 * 
 * Setup instructions:
 * 1. In Brevo (formerly Sendinblue), go to Settings > Webhooks
 * 2. Create a new webhook for the events you want to track (opened, clicked, delivered, bounced, unsubscribed)
 * 3. Set the URL to: https://londonrepaircafe.ca/api/webhooks/brevo
 * 4. This endpoint accepts POST requests from Brevo's servers
 * 
 * Note: No authentication required - Brevo sends from their servers
 * Always returns 200 OK so Brevo doesn't retry (even on errors, we log and continue)
 */

import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // If not JSON, try to parse as form data
      const text = await request.text();
      const params = new URLSearchParams(text);
      body = {};
      params.forEach((value, key) => {
        body[key] = value;
      });
    }

    // Brevo sends either an array or a single object
    const events = Array.isArray(body) ? body : [body];

    for (const event of events) {
      const event_type = event.event;
      const email = event.email;
      const message_id = event["message-id"];

      console.log("[Brevo webhook]", event_type, email);

      // Insert into email_events table
      await pool.query(
        `INSERT INTO email_events (message_id, email, event_type, metadata)
         VALUES ($1, $2, $3, $4)`,
        [message_id, email, event_type, JSON.stringify(event)]
      );
    }

    // Always return 200 - Brevo retries on non-200
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[Brevo webhook] Error:", error);
    // Even on error, return 200 to prevent retries
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}