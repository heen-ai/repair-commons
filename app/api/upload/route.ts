import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

// POST /api/upload - upload item photos (no auth required - used during registration)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("photos") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, message: "No files uploaded" }, { status: 400 });
    }

    if (files.length > 3) {
      return NextResponse.json({ success: false, message: "Maximum 3 photos per item" }, { status: 400 });
    }

    const urls: string[] = [];

    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ success: false, message: "Only image files are allowed" }, { status: 400 });
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ success: false, message: "Each photo must be under 5MB" }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Generate unique filename
      const ext = file.name.split(".").pop() || "jpg";
      const filename = `${randomBytes(12).toString("hex")}.${ext}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads", "items");
      const filepath = path.join(uploadDir, filename);

      await writeFile(filepath, buffer);
      urls.push(`/uploads/items/${filename}`);
    }

    return NextResponse.json({ success: true, urls });
  } catch (error) {
    console.error("Error uploading files:", error);
    return NextResponse.json({ success: false, message: "Upload failed" }, { status: 500 });
  }
}
