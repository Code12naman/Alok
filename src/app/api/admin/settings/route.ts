import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  DEFAULT_STORE_SETTINGS,
  normalizeStoredStoreSettings,
  validateShippingSettings,
  validateStoreSettings,
} from "@/lib/store-settings";
import { verifyFirebaseAdmin } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

const settingsRef = () => getAdminDb().collection("settings").doc("store");

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  console.error("Admin settings API failed", error);

  if (/administrator privileges/i.test(message)) {
    return NextResponse.json({ error: message }, { status: 403 });
  }
  if (/authentication|token|authenticated user|admin profile/i.test(message)) {
    return NextResponse.json({ error: message }, { status: 401 });
  }
  if (/firebase server authentication is not configured|firebase server credentials are not configured/i.test(message)) {
    return NextResponse.json(
      { error: "Store settings are temporarily unavailable because server configuration is incomplete." },
      { status: 503 }
    );
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    await verifyFirebaseAdmin(request);
    const snapshot = await settingsRef().get();
    const value = snapshot.exists
      ? { ...DEFAULT_STORE_SETTINGS, ...snapshot.data() }
      : DEFAULT_STORE_SETTINGS;
    const settings = normalizeStoredStoreSettings(value);
    if (!settings) {
      console.error("Admin settings document contains invalid values");
      return NextResponse.json(
        { error: "Stored settings are invalid. Please contact support." },
        { status: 500 }
      );
    }
    return NextResponse.json({ settings });
  } catch (error: unknown) {
    return errorResponse(error, "Unable to load store settings.");
  }
}

export async function PATCH(request: Request) {
  try {
    const adminUid = await verifyFirebaseAdmin(request);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Store settings must be an object." }, { status: 400 });
    }

    const input = body as Record<string, unknown>;
    const shippingOnly = Object.keys(input).length > 0 &&
      Object.keys(input).every((key) =>
        ["defaultShippingRate", "freeShippingEnabled", "freeShippingThreshold"].includes(key)
      );
    if (shippingOnly) {
      const result = validateShippingSettings(input);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      await settingsRef().set({
        ...result.settings,
        updatedAt: new Date(),
        updatedBy: adminUid,
      }, { merge: true });
      return NextResponse.json({ settings: result.settings });
    }

    const result = validateStoreSettings(input);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await settingsRef().set({
      ...result.settings,
      updatedAt: new Date(),
      updatedBy: adminUid,
    }, { merge: true });
    return NextResponse.json({ settings: result.settings });
  } catch (error: unknown) {
    return errorResponse(error, "Unable to save store settings.");
  }
}
