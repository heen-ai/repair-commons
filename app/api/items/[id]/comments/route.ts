'use server';

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: itemId } = await params;
  
  const user = await requireAuth(request);
  if (!user) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { comment } = body;

  if (!comment || comment.trim().length === 0) {
    return NextResponse.json({ success: false, message: 'Comment is required' }, { status: 400 });
  }

  try {
    // Insert the comment
    const result = await pool.query(
      `INSERT INTO item_comments (item_id, user_id, comment) VALUES ($1, $2, $3) RETURNING *`,
      [itemId, user.id, comment.trim()]
    );
    const newComment = result.rows[0];

    // Get the item with its owner details
    const itemResult = await pool.query(
      `SELECT i.*, u.email as owner_email, u.name as owner_name 
       FROM items i 
       JOIN users u ON i.user_id = u.id 
       WHERE i.id = $1`,
      [itemId]
    );

    if (itemResult.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Item not found' }, { status: 404 });
    }

    const item = itemResult.rows[0];

    // Get the commenter's name
    const commenterResult = await pool.query(
      'SELECT name FROM users WHERE id = $1',
      [user.id]
    );
    const commenterName = commenterResult.rows[0]?.name || 'Someone';

    // Don't notify if commenter is the owner
    if (item.user_id !== user.id) {
      // Check if owner has notification preferences
      const prefsResult = await pool.query(
        'SELECT notify_comments FROM notification_preferences WHERE user_id = $1',
        [item.user_id]
      );

      const notifyComments = prefsResult.rows.length === 0 ? true : prefsResult.rows[0].notify_comments;

      if (notifyComments) {
        // Send email notification to item owner
        const appUrl = process.env.APP_URL || 'https://londonrepaircafe.ca';
        const replyUrl = `mailto:${encodeURIComponent(commenterName)}?subject=Re: ${encodeURIComponent(item.name)}`;
        
        const emailSubject = `New comment on your item: ${item.name}`;
        const emailText = `Hi ${item.owner_name},

${commenterName} commented on your item "${item.name}":

"${comment}"

View and reply: ${appUrl}/my-registration

Reply directly to this email to respond.

- Repair Commons`;

        const emailHtml = `
          <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #15803d; margin-bottom: 8px;">Repair Commons</h2>
            <p style="font-size: 16px;">Hi ${item.owner_name},</p>
            <p style="font-size: 16px;">
              <strong>${commenterName}</strong> commented on your item "<strong>${item.name}</strong>":
            </p>
            <blockquote style="border-left: 4px solid #16a34a; padding-left: 16px; margin: 16px 0; color: #374151; font-style: italic;">
              "${comment}"
            </blockquote>
            <a href="${appUrl}/my-registration" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 8px 0;">
              View on Website
            </a>
            <p style="color: #666; font-size: 14px; margin-top: 24px;">
              <a href="${replyUrl}" style="color: #16a34a;">Reply to this email</a> to respond directly.
            </p>
            <p style="color: #666; font-size: 14px; margin-top: 16px;">
              - The Repair Commons Team
            </p>
          </div>
        `;

        await sendEmail({
          to: item.owner_email,
          subject: emailSubject,
          text: emailText,
          html: emailHtml,
        });
      }
    }

    // Return the comment with user info
    const commentWithUser = {
      ...newComment,
      user_name: commenterName,
    };

    return NextResponse.json({ success: true, comment: commentWithUser });
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json({ success: false, message: 'Failed to add comment' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: itemId } = await params;
  
  const user = await requireAuth(request);
  if (!user) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await pool.query(
      `SELECT ic.*, u.name as user_name, u.email as user_email
       FROM item_comments ic
       JOIN users u ON ic.user_id = u.id
       WHERE ic.item_id = $1
       ORDER BY ic.created_at ASC`,
      [itemId]
    );

    return NextResponse.json({ success: true, comments: result.rows });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch comments' }, { status: 500 });
  }
}
