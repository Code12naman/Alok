"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { FiGlobe, FiPercent, FiTruck } from "react-icons/fi";
import { useAdminAuth } from "@/context/AdminAuthContext";
import {
  DEFAULT_STORE_SETTINGS,
  normalizeStoredStoreSettings,
  validateShippingSettings,
  validateStoreSettings,
  type StoreSettings,
} from "@/lib/store-settings";

type SettingsFormValues = Omit<
  StoreSettings,
  "freeShippingThreshold" | "defaultShippingRate" | "gstPercentage"
> & {
  freeShippingThreshold: string;
  defaultShippingRate: string;
  gstPercentage: string;
};

const initialFormValues: SettingsFormValues = {
  ...DEFAULT_STORE_SETTINGS,
  freeShippingThreshold: String(DEFAULT_STORE_SETTINGS.freeShippingThreshold),
  defaultShippingRate: String(DEFAULT_STORE_SETTINGS.defaultShippingRate),
  gstPercentage: String(DEFAULT_STORE_SETTINGS.gstPercentage),
};

const sections = [
  {
    title: "Store Information",
    icon: FiGlobe,
    fields: [
      { key: "websiteName", label: "Website Name", type: "text" },
      { key: "storeEmail", label: "Store Email", type: "email" },
      { key: "phoneNumber", label: "Phone Number", type: "tel" },
      { key: "address", label: "Address", type: "text" },
    ],
  },
  {
    title: "Delivery Charges Configuration",
    icon: FiTruck,
    fields: [
      { key: "defaultShippingRate", label: "Delivery Charge (₹)", type: "number" },
      { key: "freeShippingThreshold", label: "Free Shipping Threshold (₹)", type: "number" },
    ],
  },
  {
    title: "Tax",
    icon: FiPercent,
    fields: [{ key: "gstPercentage", label: "GST Percentage (%)", type: "number" }],
  },
] as const;

function toFormValues(settings: StoreSettings): SettingsFormValues {
  return {
    ...settings,
    freeShippingThreshold: String(settings.freeShippingThreshold),
    defaultShippingRate: String(settings.defaultShippingRate),
    gstPercentage: String(settings.gstPercentage),
  };
}

async function responseError(response: Response, fallback: string): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (
      body &&
      typeof body === "object" &&
      "error" in body &&
      typeof body.error === "string"
    ) {
      return body.error;
    }
  } catch {
    // Use the fallback when the server does not return a JSON error.
  }
  return fallback;
}

export default function SettingsPage() {
  const { user } = useAdminAuth();
  const [settings, setSettings] = useState<SettingsFormValues>(initialFormValues);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingShipping, setSavingShipping] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadSettings = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      setLoading(true);
      setLoadError("");
      setFeedback(null);
      const response = await fetch("/api/admin/settings", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(await responseError(response, "Unable to load store settings."));
      }

      const body: unknown = await response.json();
      const storedSettings =
        body && typeof body === "object" && "settings" in body
          ? body.settings
          : undefined;
      const loadedSettings = normalizeStoredStoreSettings(storedSettings);
      if (!loadedSettings) {
        throw new Error("The server returned invalid store settings. Please contact support.");
      }
      setSettings(toFormValues(loadedSettings));
    } catch (error: unknown) {
      setLoadError(error instanceof Error ? error.message : "Unable to load store settings.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void Promise.resolve().then(loadSettings);
  }, [loadSettings]);

  function updateField(key: keyof SettingsFormValues, value: string) {
    setSettings((current) => ({ ...current, [key]: value }));
    setFeedback(null);
  }

  async function saveShippingSettings() {
    if (!user) {
      setFeedback({ type: "error", message: "Your administrator session has expired. Sign in again to save." });
      return;
    }

    const result = validateShippingSettings({
      freeShippingEnabled: settings.freeShippingEnabled,
      freeShippingThreshold: Number(settings.freeShippingThreshold),
      defaultShippingRate: Number(settings.defaultShippingRate),
    });
    if (!result.success) {
      setFeedback({ type: "error", message: result.error });
      return;
    }

    setSavingShipping(true);
    setFeedback(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(result.settings),
      });
      if (!response.ok) {
        throw new Error(await responseError(response, "Unable to save shipping settings."));
      }

      const body: unknown = await response.json();
      const savedSettings =
        body && typeof body === "object" && "settings" in body
          ? body.settings
          : undefined;
      const saved = validateShippingSettings(savedSettings);
      if (!saved.success) {
        throw new Error("Shipping settings were saved, but the server returned invalid values.");
      }
      setSettings((current) => ({
        ...current,
        ...saved.settings,
        defaultShippingRate: String(saved.settings.defaultShippingRate),
        freeShippingThreshold: String(saved.settings.freeShippingThreshold),
      }));
      setFeedback({ type: "success", message: "Shipping settings saved successfully." });
    } catch (error: unknown) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to save shipping settings.",
      });
    } finally {
      setSavingShipping(false);
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      setFeedback({ type: "error", message: "Your administrator session has expired. Sign in again to save." });
      return;
    }

    const result = validateStoreSettings({
      ...settings,
      freeShippingThreshold: Number(settings.freeShippingThreshold),
      defaultShippingRate: Number(settings.defaultShippingRate),
      gstPercentage: Number(settings.gstPercentage),
    });
    if (!result.success) {
      setFeedback({ type: "error", message: result.error });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(result.settings),
      });
      if (!response.ok) {
        throw new Error(await responseError(response, "Unable to save store settings."));
      }

      const body: unknown = await response.json();
      const savedSettings =
        body && typeof body === "object" && "settings" in body
          ? body.settings
          : undefined;
      const saved = validateStoreSettings(savedSettings);
      if (!saved.success) {
        throw new Error("Settings were saved, but the server returned an invalid response.");
      }
      setSettings(toFormValues(saved.settings));
      setFeedback({ type: "success", message: "Settings saved successfully." });
    } catch (error: unknown) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to save store settings.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="mt-0.5 text-sm text-white/40">General store settings</p>
      </div>

      {loadError && (
        <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          <p>{loadError}</p>
          <button
            type="button"
            onClick={() => void loadSettings()}
            className="mt-2 font-semibold underline underline-offset-2"
          >
            Try again
          </button>
        </div>
      )}

      {loading && <p role="status" className="text-sm text-white/60">Loading settings...</p>}

      <form onSubmit={saveSettings}>
        <fieldset disabled={loading || Boolean(loadError) || saving || savingShipping} className="space-y-5 disabled:opacity-70">
          {sections.map((section) => (
            <section key={section.title} className="rounded-xl border border-white/[0.07] bg-[#141414] p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-white/60">
                <section.icon className="h-4 w-4" /> {section.title}
              </h2>
              {section.title === "Delivery Charges Configuration" && (
                <label className="mb-4 flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-white/[0.07] bg-[#0a0a0a] p-3.5">
                  <span>
                    <span className="block text-sm font-medium text-white">Enable Free Shipping</span>
                    <span className="mt-0.5 block text-xs text-white/40">
                      Waive the delivery charge when the order reaches the threshold.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    role="switch"
                    checked={settings.freeShippingEnabled}
                    onChange={(event) => {
                      setSettings((current) => ({
                        ...current,
                        freeShippingEnabled: event.target.checked,
                      }));
                      setFeedback(null);
                    }}
                    className="h-4 w-4 accent-[#ff6500]"
                  />
                </label>
              )}
              <div className="space-y-3">
                {section.fields.map((field) => {
                  const key = field.key as Exclude<keyof SettingsFormValues, "freeShippingEnabled">;
                  const numeric = field.type === "number";
                  return (
                    <div key={field.key}>
                      <label htmlFor={field.key} className="mb-1.5 block text-xs text-white/50">
                        {field.label}
                      </label>
                      <input
                        id={field.key}
                        name={field.key}
                        type={field.type}
                        required
                        min={numeric ? 0 : undefined}
                        max={field.key === "gstPercentage" ? 100 : undefined}
                        step={numeric ? "0.01" : undefined}
                        value={settings[key]}
                        onChange={(event) => updateField(key, event.target.value)}
                        className="w-full rounded-lg border border-white/[0.07] bg-[#0a0a0a] px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-[#ff6500]/50 focus:outline-none"
                      />
                    </div>
                  );
                })}
              </div>
              {section.title === "Delivery Charges Configuration" && (
                <button
                  type="button"
                  onClick={() => void saveShippingSettings()}
                  disabled={loading || Boolean(loadError) || saving || savingShipping}
                  className="mt-4 rounded-lg bg-[#ff6500] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#ff6500]/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingShipping ? "Saving Shipping Settings..." : "Save Shipping Settings"}
                </button>
              )}
            </section>
          ))}

          <button
            type="submit"
            disabled={loading || Boolean(loadError) || saving}
            className="rounded-lg bg-[#ff6500] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#ff6500]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </fieldset>
      </form>

      {feedback && (
        <p
          role={feedback.type === "error" ? "alert" : "status"}
          className={`text-sm ${feedback.type === "error" ? "text-red-300" : "text-green-300"}`}
        >
          {feedback.message}
        </p>
      )}
    </div>
  );
}
