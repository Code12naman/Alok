import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { verifyFirebaseAdmin } from "@/lib/server-auth";

export async function POST(request: Request) {
  try {
    const uid = await verifyFirebaseAdmin(request);
    const body = await request.json();
    const publicId = typeof body?.publicId === "string" ? body.publicId.trim() : "";
    if (!publicId) {
      return NextResponse.json({ error: "A valid publicId is required." }, { status: 400 });
    }

    const result = await cloudinary.uploader.destroy(publicId);
    console.info("[CloudinaryDelete] Asset deletion requested.", { uid, publicId });
    return NextResponse.json({
      success: result.result === "ok" || result.result === "not found",
      result: result.result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to delete Cloudinary asset.";
    const status = message.includes("Authentication") || message.includes("privileges") || message.includes("Admin")
      ? 401
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
