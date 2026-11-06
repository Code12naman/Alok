import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  DEFAULT_STORE_SETTINGS,
  normalizeShippingSettings,
} from "@/lib/store-settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const snapshot = await getAdminDb().collection("settings").doc("store").get();
    const settings = normalizeShippingSettings(
      snapshot.exists ? snapshot.data() : DEFAULT_STORE_SETTINGS
    );
    if (!settings) {
      console.error("Store shipping settings document contains invalid values");
      return NextResponse.json(
        { error: "Shipping settings are invalid. Please try again later." },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { settings },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    console.error("Unable to load public shipping settings", error);
    return NextResponse.json(
      { error: "Shipping settings are temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
