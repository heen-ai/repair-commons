import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import pool from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { sendRegistrationConfirmation } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event_id, email, name, items } = body;

    if (!event_id || !email || !name) {
      return NextResponse.json({ success: false, message: "event_id, email, and name are required" }, { status: 400 });
    }

    // Get or create user
    const user = await getOrCreateUser(email, name);

    // Check event exists and has capacity (also get venue info)
    const eventResult = await pool.query(
      `SELECT e.*, 
        (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status != 'cancelled') as reg_count,
        v.name as venue_name, v.address as venue_address, v.city as venue_city
       FROM events e 
       LEFT JOIN venues v ON e.venue_id = v.id
       WHERE e.id = $1`,
      [event_id]
    );
    if (eventResult.rows.length === 0) {
      return NextResponse.json({ success: false, message: "Event not found" }, { status: 404 });
    }
    const event = eventResult.rows[0];

    // Check not already registered
    const existing = await pool.query(
      "SELECT id FROM registrations WHERE event_id = $1 AND user_id = $2 AND status != 'cancelled'",
      [event_id, user.id]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json({ success: false, message: "Already registered for this event" }, { status: 409 });
    }

    // Determine status
    const regCount = parseInt(event.reg_count);
    const status = regCount >= event.capacity && event.waitlist_enabled ? "waitlisted" : "registered";
    if (regCount >= event.capacity && !event.waitlist_enabled) {
      return NextResponse.json({ success: false, message: "Event is full" }, { status: 409 });
    }

    // Create registration
    const qrCode = randomBytes(16).toString("hex");
    const managementToken = randomBytes(16).toString("hex");
    const regResult = await pool.query(
      `INSERT INTO registrations (event_id, user_id, status, qr_code, position, token)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [event_id, user.id, status, qrCode, regCount + 1, managementToken]
    );
    const registration = regResult.rows[0];

    // Create items
    const registeredItems: string[] = [];
    if (items && Array.isArray(items)) {
      for (const item of items) {
        if (item.name && item.problem) {
          await pool.query(
            `INSERT INTO items (registration_id, user_id, event_id, name, problem, status)
             VALUES ($1, $2, $3, $4, $5, 'registered')`,
            [registration.id, user.id, event_id, item.name, item.problem]
          );
          registeredItems.push(item.name);
        }
      }
    }

    // Send confirmation email
    const eventDate = new Date(event.date).toLocaleDateString("en-CA", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const eventTime = `${event.start_time} - ${event.end_time}`;
    const venueAddress = [event.venue_address, event.venue_city].filter(Boolean).join(", ");

    await sendRegistrationConfirmation({
      email: user.email,
      name: user.name,
      eventName: event.title,
      eventDate,
      eventTime,
      venueName: event.venue_name || "TBD",
      venueAddress: venueAddress || "TBD",
      items: registeredItems,
      status,
      registrationId: registration.id,
      managementToken,
    });

    return NextResponse.json({
      success: true,
      registration: { ...registration, qr_code: qrCode, token: managementToken },
      user: { id: user.id, name: user.name, email: user.email },
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating registration:", error);
    return NextResponse.json({ success: false, message: "Registration failed" }, { status: 500 });
  }
}
