import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import pool from "@/lib/db";

// GET /api/volunteer/dashboard - unified dashboard
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const volResult = await pool.query(
      "SELECT * FROM volunteers WHERE LOWER(email) = LOWER($1)",
      [user.email]
    );

    const volunteer = volResult.rows[0];
    if (!volunteer) {
      return NextResponse.json(
        { success: false, message: "You're not registered as a volunteer yet." },
        { status: 404 }
      );
    }

    const isFixer = volunteer.is_fixer === true;
    const isHelper = volunteer.is_helper === true;

    const profile = {
      name: volunteer.name,
      email: user.email,
      phone: volunteer.phone || "",
      is_fixer: isFixer,
      is_helper: isHelper,
      skills: Array.isArray(volunteer.skills) ? volunteer.skills.join(", ") : volunteer.skills || "",
      roles: volunteer.roles || [],
      availability: volunteer.availability || "",
      comments: volunteer.comments || "",
    };

    // Events with RSVP status
    const eventsResult = await pool.query(
      `SELECT e.id, e.title, e.date, e.start_time, e.end_time,
              v.name as venue_name, v.address as venue_address,
              COALESCE(ver.response, '') as rsvp_status
       FROM events e
       JOIN venues v ON e.venue_id = v.id
       LEFT JOIN volunteer_event_rsvps ver ON e.id = ver.event_id AND ver.volunteer_id = $1
       WHERE e.date >= CURRENT_DATE AND e.status != 'cancelled'
       ORDER BY e.date ASC`,
      [volunteer.id]
    );

    // Items for all volunteers (from events they RSVPed yes to) - fixers can claim, helpers can view
    let items: any[] = [];
    const rsvpResult = await pool.query(
      "SELECT event_id FROM volunteer_event_rsvps WHERE volunteer_id = $1 AND response = 'yes'",
      [volunteer.id]
    );
    const rsvpEventIds = rsvpResult.rows.map(r => r.event_id);

    if (rsvpEventIds.length > 0) {
      const itemsResult = await pool.query(
        `SELECT i.id, i.name, i.item_type, i.problem, i.status, i.description,
                i.photos,
                e.title as event_title,
                u.name as owner_name,
                fi.id as interest_id,
                (SELECT COUNT(*) FROM item_comments ic WHERE ic.item_id = i.id) as comment_count,
                COALESCE(
                  (SELECT json_agg(json_build_object(
                    'id', ic.id,
                    'comment', ic.comment,
                    'author_name', cu.name,
                    'created_at', ic.created_at
                  ) ORDER BY ic.created_at ASC)
                  FROM item_comments ic
                  JOIN users cu ON ic.user_id = cu.id
                  WHERE ic.item_id = i.id),
                  '[]'
                ) as comments
         FROM items i
         JOIN events e ON i.event_id = e.id
         LEFT JOIN users u ON i.user_id = u.id
         LEFT JOIN fixer_interest fi ON i.id = fi.item_id AND fi.fixer_id = $1
         WHERE i.event_id = ANY($2)
         AND i.status NOT IN ('completed', 'cancelled')
         ORDER BY e.date ASC, i.created_at DESC`,
        [user.id, rsvpEventIds]
      );
      items = itemsResult.rows.map(row => ({
        ...row,
        photos: Array.isArray(row.photos) ? row.photos : [],
        comments: Array.isArray(row.comments) ? row.comments : [],
      }));
    }

    return NextResponse.json({ success: true, profile, events: eventsResult.rows, items });
  } catch (error) {
    console.error("Error fetching volunteer dashboard:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch dashboard" }, { status: 500 });
  }
}

// PUT /api/volunteer/dashboard - update profile
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, skills, roles, availability, comments } = body;

    const volResult = await pool.query(
      "SELECT id FROM volunteers WHERE LOWER(email) = LOWER($1)",
      [user.email]
    );
    if (volResult.rows.length === 0) {
      return NextResponse.json({ success: false, message: "Volunteer not found" }, { status: 404 });
    }

    const skillsArray = skills
      ? `{${skills.split(",").map((s: string) => `"${s.trim()}"`).filter((s: string) => s !== '""').join(",")}}`
      : '{}';

    await pool.query(
      `UPDATE volunteers SET name = $1, phone = $2, skills = $3, roles = $4, availability = $5, comments = $6, updated_at = NOW()
       WHERE id = $7`,
      [name, phone || null, skillsArray, roles || '{}', availability || null, comments || null, volResult.rows[0].id]
    );

    // Also update user name
    await pool.query("UPDATE users SET name = $1 WHERE id = $2", [name, user.id]);

    return NextResponse.json({ success: true, message: "Profile updated" });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ success: false, message: "Failed to update profile" }, { status: 500 });
  }
}
