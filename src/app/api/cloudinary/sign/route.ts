import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";

interface AuthResult {
  authorized: boolean;
  status: number;
  uid?: string;
  email?: string;
  error?: string;
}

/**
 * Helper to verify that the incoming request is sent by an authenticated admin user.
 */
async function verifyAdminAuth(request: Request): Promise<AuthResult> {
  try {
    const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");
    console.log("[CloudinaryAuth] Authorization header present:", Boolean(authHeader));

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn("[CloudinaryAuth] Missing or malformed Authorization header.");
      return { authorized: false, status: 401, error: "Missing or malformed Authorization header." };
    }

    const idToken = authHeader.replace("Bearer ", "").trim();
    console.log("[CloudinaryAuth] ID Token extracted (length):", idToken.length);

    const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (!firebaseApiKey || !projectId) {
      console.error("[CloudinaryAuth] Server missing NEXT_PUBLIC_FIREBASE_API_KEY or NEXT_PUBLIC_FIREBASE_PROJECT_ID.");
      return { authorized: false, status: 500, error: "Server credentials configuration error." };
    }

    // 1. Verify token via Firebase Auth REST API
    const authRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!authRes.ok) {
      const errBody = await authRes.json().catch(() => ({}));
      console.warn("[CloudinaryAuth] Firebase token verification failed:", errBody);
      return { authorized: false, status: 401, error: "Invalid or expired authentication token." };
    }

    const authData = await authRes.json();
    const userRecord = authData.users?.[0];
    const uid = userRecord?.localId;
    const email = userRecord?.email;

    console.log("[CloudinaryAuth] Token verification succeeded.");
    console.log("[CloudinaryAuth] Decoded UID:", uid);
    console.log("[CloudinaryAuth] Decoded Email:", email || "N/A");

    if (!uid) {
      return { authorized: false, status: 401, error: "User ID not found in verified token." };
    }

    // 2. Fetch user profile document from Firestore REST API passing the Bearer idToken
    const documentPath = `users/${uid}`;
    console.log("[CloudinaryAuth] Querying Firestore user document path:", documentPath);

    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${documentPath}`;
    const userRes = await fetch(firestoreUrl, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    console.log("[CloudinaryAuth] Firestore user document HTTP status:", userRes.status);
    console.log("[CloudinaryAuth] Firestore user document exists:", userRes.ok);

    if (userRes.status === 404) {
      console.warn(`[CloudinaryAuth] User document "${documentPath}" not found in Firestore.`);
      return { authorized: false, status: 404, error: "Admin profile document not found in database." };
    }

    if (!userRes.ok) {
      const errJson = await userRes.json().catch(() => ({}));
      console.error("[CloudinaryAuth] Firestore REST fetch error:", errJson);
      return { authorized: false, status: userRes.status || 500, error: "Failed to verify user profile from database." };
    }

    const userData = await userRes.json();
    const role = userData.fields?.role?.stringValue;
    console.log("[CloudinaryAuth] Role found in Firestore document:", role || "none");

    if (role !== "admin") {
      console.warn(`[CloudinaryAuth] Access forbidden: User (${uid}) has role "${role}", expected "admin".`);
      return { authorized: false, status: 403, error: "Forbidden: Admin privileges required." };
    }

    console.log(`[CloudinaryAuth] Admin authorization successful for UID: ${uid}`);
    return { authorized: true, status: 200, uid, email };
  } catch (err: any) {
    console.error("[CloudinaryAuth] Unexpected verification error:", err);
    return { authorized: false, status: 500, error: "Authentication verification encountered a server error." };
  }
}

export async function POST(request: Request) {
  try {
    // 1. Verify Admin Authorization
    const authCheck = await verifyAdminAuth(request);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.error || "Unauthorized" },
        { status: authCheck.status || 403 }
      );
    }

    // 2. Read environment variables
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.error("[CloudinarySign] Missing server credentials.");
      return NextResponse.json(
        { error: "Cloudinary environment variables missing on server." },
        { status: 500 }
      );
    }

    // 3. Generate signature parameters
    const timestamp = Math.round(Date.now() / 1000);
    const folder = "street-mode/products";

    const paramsToSign = {
      timestamp,
      folder,
    };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    console.log(`[CloudinarySign] Generated signature for admin UID (${authCheck.uid}) folder: ${folder}`);

    return NextResponse.json({
      signature,
      timestamp,
      cloudName,
      apiKey,
      folder,
    });
  } catch (error: any) {
    console.error("[CloudinarySign] Internal error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate upload signature." },
      { status: 500 }
    );
  }
}
