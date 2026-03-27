import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

// POST /api/upload/item-photo - upload a single repair photo
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ success: false, message: "No file uploaded" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ success: false, message: "Only image files are allowed" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: "Photo must be under 10MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.name.split(".").pop() || "jpg";
    const filename = `repair-${randomBytes(12).toString("hex")}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "repairs");
    
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);

    return NextResponse.json({ success: true, url: `/uploads/repairs/${filename}` });
  } catch (error) {
    console.error("Error uploading repair photo:", error);
    return NextResponse.json({ success: false, message: "Upload failed" }, { status: 500 });
  }
}
