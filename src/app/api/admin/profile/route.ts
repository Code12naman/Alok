import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyFirebaseAdmin } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isProfilePhoto(url: unknown, publicId: unknown, uid: string): boolean {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (
    !cloudName ||
    typeof url !== "string" ||
    typeof publicId !== "string" ||
    !publicId.startsWith(`classic-threads/admin-profiles/${uid}/`)
  ) {
    return false;
  }

  const leaf = publicId.slice(`classic-threads/admin-profiles/${uid}/`.length);
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(leaf)) return false;

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "https:" &&
      parsedUrl.hostname === "res.cloudinary.com" &&
      parsedUrl.pathname.startsWith(`/${cloudName}/image/upload/`) &&
      (parsedUrl.pathname.endsWith(`/${publicId}`) ||
        parsedUrl.pathname.endsWith(`/${publicId}.jpg`) ||
        parsedUrl.pathname.endsWith(`/${publicId}.png`) ||
        parsedUrl.pathname.endsWith(`/${publicId}.webp`));
  } catch {
    return false;
  }
}

function accountCreationDate(value: unknown): string | null {
  if (!value || typeof value !== "object" || !("toDate" in value) ||
    typeof value.toDate !== "function") {
    return null;
  }
  const date = value.toDate();
  return date instanceof Date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function authError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to access the admin profile.";
  console.error("Admin profile API failed", error);
  const status = /administrator privileges/i.test(message)
    ? 403
    : /authentication|token|admin profile/i.test(message)
      ? 401
      : /not configured/i.test(message)
        ? 503
        : 500;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  try {
    const uid = await verifyFirebaseAdmin(request);
    const snapshot = await getAdminDb().collection("users").doc(uid).get();
    if (!snapshot.exists || snapshot.get("role") !== "admin") {
      return NextResponse.json({ error: "Administrator privileges are required." }, { status: 403 });
    }

    const data = snapshot.data() || {};
    return NextResponse.json({
      profile: {
        uid,
        name: typeof data.name === "string" ? data.name : "",
        email: typeof data.email === "string" ? data.email : "",
        phone: typeof data.phone === "string" ? data.phone : "",
        photoURL: typeof data.photoURL === "string" ? data.photoURL : "",
        photoPublicId: typeof data.photoPublicId === "string" ? data.photoPublicId : "",
        createdAt: accountCreationDate(data.createdAt),
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: unknown) {
    return authError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const uid = await verifyFirebaseAdmin(request);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Profile details must be an object." }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    const allowedKeys = ["name", "phone", "photoURL", "photoPublicId"];
    if (Object.keys(input).some((key) => !allowedKeys.includes(key))) {
      return NextResponse.json({ error: "Profile changes contain unsupported fields." }, { status: 400 });
    }

    const name = typeof input.name === "string" ? input.name.trim() : "";
    const phone = typeof input.phone === "string" ? input.phone.trim() : "";
    const photoURL = input.photoURL;
    const photoPublicId = input.photoPublicId;
    if (!name || name.length > 120) {
      return NextResponse.json({ error: "Full name is required and must be 120 characters or fewer." }, { status: 400 });
    }
    if (phone.length > 40 || (phone && !/^[+()\d\s.-]{7,40}$/.test(phone))) {
      return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
    }
    if (
      !((photoURL === "" && photoPublicId === "") ||
        isProfilePhoto(photoURL, photoPublicId, uid))
    ) {
      return NextResponse.json({ error: "Profile photo must be uploaded to your secure profile folder." }, { status: 400 });
    }

    const profileRef = getAdminDb().collection("users").doc(uid);
    const snapshot = await profileRef.get();
    if (!snapshot.exists || snapshot.get("role") !== "admin") {
      return NextResponse.json({ error: "Administrator privileges are required." }, { status: 403 });
    }

    await profileRef.update({
      name,
      phone,
      photoURL,
      photoPublicId,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      profile: {
        uid,
        name,
        email: typeof snapshot.get("email") === "string" ? snapshot.get("email") : "",
        phone,
        photoURL,
        photoPublicId,
        createdAt: accountCreationDate(snapshot.get("createdAt")),
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: unknown) {
    return authError(error);
  }
}
