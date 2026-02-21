import { NextRequest } from "next/server";
import { randomBytes, createHash } from "crypto";
import nodemailer from "nodemailer";
import pool from "./db";

export const SESSION_COOKIE_NAME = "revive-session";
const ADMIN_EMAILS = ["1heenal@gmail.com", "heenal@reimagineco.ca"];

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// Get or create user by email
export async function getOrCreateUser(email: string, name?: string) {
  const existing = await pool.query(
    "SELECT * FROM users WHERE email = $1",
    [email.toLowerCase()]
  );
  if (existing.rows.length > 0) return existing.rows[0];

  const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
  const result = await pool.query(
    `INSERT INTO users (email, name, role) VALUES ($1, $2, $3) RETURNING *`,
    [email.toLowerCase(), name || email.split("@")[0], isAdmin ? "admin" : "attendee"]
  );
  return result.rows[0];
}

// Request a magic link
export async function requestMagicLink(email: string, options?: { name?: string; baseUrl?: string }) {
  const user = await getOrCreateUser(email, options?.name);
  const token = generateToken();
  const hashedToken = hashToken(token);

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);

  await pool.query(
    `INSERT INTO auth_tokens (user_id, token, type, expires_at) VALUES ($1, $2, 'magic_link', $3)`,
    [user.id, hashedToken, expiresAt]
  );

  const baseUrl = options?.baseUrl || process.env.APP_URL || "http://localhost:3300";
  const magicLinkUrl = `${baseUrl}/auth/verify?token=${token}`;

  await sendMagicLinkEmail(email, magicLinkUrl, user.name);

  return { success: true, token, magicLinkUrl, user };
}

// Verify a magic link token
export async function verifyMagicLink(token: string) {
  const hashedToken = hashToken(token);

  const result = await pool.query(
    `SELECT at.*, u.id as uid, u.email, u.name, u.role
     FROM auth_tokens at JOIN users u ON at.user_id = u.id
     WHERE at.token = $1 AND at.used_at IS NULL AND at.expires_at > NOW()`,
    [hashedToken]
  );

  if (result.rows.length === 0) {
    return { success: false, message: "Invalid or expired link" };
  }

  const record = result.rows[0];

  // Mark token used
  await pool.query("UPDATE auth_tokens SET used_at = NOW() WHERE token = $1", [hashedToken]);

  // Mark email verified
  await pool.query("UPDATE users SET email_verified = true WHERE id = $1", [record.uid]);

  // Create session
  const sessionToken = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await pool.query(
    `INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)`,
    [record.uid, sessionToken, expiresAt]
  );

  return {
    success: true,
    sessionToken,
    user: { id: record.uid, email: record.email, name: record.name, role: record.role },
  };
}

// Get current user from session cookie
export async function requireAuth(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) return null;

  const result = await pool.query(
    `SELECT u.id, u.email, u.name, u.role
     FROM users u JOIN sessions s ON s.user_id = u.id
     WHERE s.token = $1 AND s.expires_at > NOW()`,
    [sessionToken]
  );

  return result.rows[0] || null;
}

export function isAdmin(user: { role: string } | null) {
  return user?.role === "admin";
}

// Send magic link email
async function sendMagicLinkEmail(email: string, url: string, name?: string) {
  const displayName = name || email.split("@")[0];

  if (!process.env.SMTP_PASS || process.env.SMTP_PASS === "password") {
    console.log(`[DEV] Magic link for ${email}: ${url}`);
    return;
  }

  const transporter = createTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM || `"Repair Commons" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Sign in to Repair Commons",
    text: `Hi ${displayName},\n\nClick to sign in:\n${url}\n\nExpires in 1 hour.\n\n- Repair Commons`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #15803d;">Repair Commons</h2>
        <p>Hi ${displayName},</p>
        <p>Click below to sign in:</p>
        <a href="${url}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Sign In</a>
        <p style="color: #666; font-size: 14px; margin-top: 24px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}
