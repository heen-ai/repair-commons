import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import pool from "@/lib/db";
import { sendEmail } from "@/lib/email";

// GET /api/items/[id]/comments - get comments for an item
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id: itemId } = await params;

    const result = await pool.query(
      `SELECT ic.id, ic.comment, ic.created_at, u.name as author_name, u.role as author_role
       FROM item_comments ic
       JOIN users u ON ic.user_id = u.id
       WHERE ic.item_id = $1
       ORDER BY ic.created_at ASC`,
      [itemId]
    );

    return NextResponse.json({ success: true, comments: result.rows });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch comments" }, { status: 500 });
  }
}

// POST /api/items/[id]/comments - add a comment/question to an item
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { comment } = body;
    const { id: itemId } = await params;

    if (!comment) {
      return NextResponse.json(
        { success: false, message: "Comment is required" },
        { status: 400 }
      );
    }

    // Get item details + owner info
    const itemResult = await pool.query(
      `SELECT i.id, i.name as item_name, i.user_id as owner_id,
              u.email as owner_email, u.name as owner_name,
              e.title as event_title
       FROM items i
       LEFT JOIN users u ON i.user_id = u.id
       LEFT JOIN events e ON i.event_id = e.id
       WHERE i.id = $1`,
      [itemId]
    );

    if (itemResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Item not found" },
        { status: 404 }
      );
    }

    const item = itemResult.rows[0];

    // Create the comment
    const result = await pool.query(
      `INSERT INTO item_comments (item_id, user_id, comment)
       VALUES ($1, $2, $3)
       RETURNING id, created_at`,
      [itemId, user.id, comment]
    );

    // Email the item owner if fixer is asking a question (not the owner themselves)
    if (item.owner_email && item.owner_id !== user.id) {
      const appUrl = process.env.APP_URL || "https://londonrepaircafe.ca";
      const replyLink = `${appUrl}/my-items?highlight=${itemId}`;

      await sendEmail({
        to: item.owner_email,
        replyTo: `"London Repair Café" <repaircafe@agentmail.to>`,
        subject: `Question about your ${item.item_name} - London Repair Cafe [item:${itemId}]`,
        text: `Hi ${item.owner_name || "there"},

A fixer has a question about your item "${item.item_name}"${item.event_title ? ` for ${item.event_title}` : ""}:

"${comment}"

You can reply directly to this email and your response will be shared with the fixers, or reply in the app: ${replyLink}

- London Repair Cafe Team`,
        html: `
          <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #15803d; margin-bottom: 8px;">London Repair Cafe</h2>
            <p>Hi ${item.owner_name || "there"},</p>
            <p>A fixer has a question about your item <strong>"${item.item_name}"</strong>${item.event_title ? ` for <strong>${item.event_title}</strong>` : ""}:</p>
            <div style="background: #f3f4f6; border-left: 4px solid #16a34a; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
              <p style="margin: 0; font-style: italic;">"${comment}"</p>
              <p style="margin: 8px 0 0; font-size: 13px; color: #666;">- ${user.name || "A fixer"}</p>
            </div>
            <p style="color: #374151; font-size: 14px; margin: 16px 0 8px;">You can <strong>reply directly to this email</strong> and your response will be shared with the fixers.</p>
            <a href="${replyLink}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Or reply in the app
            </a>
            <p style="color: #666; font-size: 14px; margin-top: 24px;">
              - The London Repair Cafe Team
            </p>
          </div>
        `,
      });
    }

    return NextResponse.json({
      success: true,
      message: item.owner_email && item.owner_id !== user.id
        ? "Question sent! The owner has been notified by email."
        : "Comment added successfully.",
      comment: result.rows[0],
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    return NextResponse.json(
      { success: false, message: "Failed to add comment" },
      { status: 500 }
    );
  }
}
