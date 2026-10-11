import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { verifyFirebaseAdmin } from "@/lib/server-auth";

export async function POST(request: Request) {
  try {
    const uid = await verifyFirebaseAdmin(request);
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: "Cloudinary is not configured." }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const folder = typeof body?.folder === "string" && body.folder.trim()
      ? body.folder.trim()
      : "street-mode/products";
    const timestamp = Math.round(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request({ timestamp, folder }, apiSecret);

    console.info("[CloudinarySign] Generated upload signature.", { uid, folder });
    return NextResponse.json({ signature, timestamp, cloudName, apiKey, folder });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to sign upload request.";
    const status = message.includes("Authentication") || message.includes("privileges") || message.includes("Admin")
      ? 401
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
