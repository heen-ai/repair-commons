import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const token = body.token || req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token required" }, { status: 401 });
  const result = await pool.query(
    `UPDATE registrations SET status = 'checked_in', checked_in_at = NOW()
     WHERE id = $1 AND token = $2 AND status != 'checked_in' RETURNING id, status, checked_in_at`,
    [id, token]
  );
  if (result.rowCount === 0) return NextResponse.json({ error: "Invalid token or already checked in" }, { status: 400 });
  return NextResponse.json({ success: true, message: "Checked in!" });
}
