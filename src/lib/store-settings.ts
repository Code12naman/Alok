export interface StoreSettings {
  websiteName: string;
  storeEmail: string;
  phoneNumber: string;
  address: string;
  freeShippingEnabled: boolean;
  freeShippingThreshold: number;
  defaultShippingRate: number;
  gstPercentage: number;
}

export type ShippingSettings = Pick<
  StoreSettings,
  "freeShippingEnabled" | "freeShippingThreshold" | "defaultShippingRate"
>;

const MAX_AMOUNT_IN_RUPEES = Number.MAX_SAFE_INTEGER / 100;

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  websiteName: "",
  storeEmail: "",
  phoneNumber: "",
  address: "",
  freeShippingEnabled: false,
  freeShippingThreshold: 0,
  defaultShippingRate: 0,
  gstPercentage: 0,
};

export function normalizeShippingSettings(value: unknown): ShippingSettings | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const input = value as Record<string, unknown>;
  const freeShippingEnabled = input.freeShippingEnabled === undefined
    ? DEFAULT_STORE_SETTINGS.freeShippingEnabled
    : input.freeShippingEnabled;
  const freeShippingThreshold = input.freeShippingThreshold === undefined
    ? DEFAULT_STORE_SETTINGS.freeShippingThreshold
    : input.freeShippingThreshold;
  const defaultShippingRate = input.defaultShippingRate === undefined
    ? DEFAULT_STORE_SETTINGS.defaultShippingRate
    : input.defaultShippingRate;

  if (
    typeof freeShippingEnabled !== "boolean" ||
    !isValidAmount(freeShippingThreshold) ||
    !isValidAmount(defaultShippingRate)
  ) {
    return null;
  }

  return {
    freeShippingEnabled,
    freeShippingThreshold,
    defaultShippingRate,
  };
}

export function calculateDeliveryCharge(
  subtotal: number,
  settings: ShippingSettings
): number {
  if (!isValidAmount(subtotal)) {
    throw new Error("Order subtotal must be a valid amount of ₹0 or more.");
  }
  const normalizedSettings = normalizeShippingSettings(settings);
  if (!normalizedSettings) {
    throw new Error("Shipping settings contain invalid amounts.");
  }

  const subtotalPaise = Math.round(subtotal * 100);
  const thresholdPaise = Math.round(normalizedSettings.freeShippingThreshold * 100);
  if (normalizedSettings.freeShippingEnabled && subtotalPaise >= thresholdPaise) {
    return 0;
  }
  return Math.round(normalizedSettings.defaultShippingRate * 100) / 100;
}

function isValidAmount(value: unknown): value is number {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= MAX_AMOUNT_IN_RUPEES &&
    Number.isSafeInteger(Math.round(value * 100));
}

type SettingsValidation =
  | { success: true; settings: StoreSettings }
  | { success: false; error: string };

type ShippingSettingsValidation =
  | { success: true; settings: ShippingSettings }
  | { success: false; error: string };

export function normalizeStoredStoreSettings(value: unknown): StoreSettings | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const input = value as Record<string, unknown>;
  const textFields = ["websiteName", "storeEmail", "phoneNumber", "address"] as const;
  const shippingSettings = normalizeShippingSettings(input);
  const gstPercentage = input.gstPercentage;
  if (!shippingSettings || !isValidAmount(gstPercentage) || gstPercentage > 100) return null;

  const settings = { ...DEFAULT_STORE_SETTINGS };

  for (const key of textFields) {
    const field = input[key];
    if (typeof field !== "string" || field.length > 500) return null;
    settings[key] = field;
  }
  Object.assign(settings, shippingSettings);
  settings.gstPercentage = gstPercentage;

  return settings;
}

export function validateShippingSettings(value: unknown): ShippingSettingsValidation {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { success: false, error: "Shipping settings must be an object." };
  }

  const input = value as Record<string, unknown>;
  if (typeof input.freeShippingEnabled !== "boolean") {
    return { success: false, error: "Free shipping must be enabled or disabled." };
  }

  const defaultShippingRate = input.defaultShippingRate;
  if (!isValidAmount(defaultShippingRate)) {
    return { success: false, error: "Delivery charge must be a valid amount of ₹0 or more." };
  }
  const freeShippingThreshold = input.freeShippingThreshold;
  if (!isValidAmount(freeShippingThreshold)) {
    return { success: false, error: "Free shipping threshold must be a valid amount of ₹0 or more." };
  }

  return {
    success: true,
    settings: {
      freeShippingEnabled: input.freeShippingEnabled,
      defaultShippingRate,
      freeShippingThreshold,
    },
  };
}

export function validateStoreSettings(value: unknown): SettingsValidation {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { success: false, error: "Store settings must be an object." };
  }

  const input = value as Record<string, unknown>;
  const textFields = [
    ["websiteName", "Website name", 120],
    ["storeEmail", "Store email", 254],
    ["phoneNumber", "Phone number", 40],
    ["address", "Address", 500],
  ] as const;
  const settings = { ...DEFAULT_STORE_SETTINGS };

  for (const [key, label, maxLength] of textFields) {
    const field = input[key];
    if (typeof field !== "string" || !field.trim()) {
      return { success: false, error: `${label} is required.` };
    }
    const normalized = field.trim();
    if (normalized.length > maxLength) {
      return { success: false, error: `${label} must be ${maxLength} characters or fewer.` };
    }
    settings[key] = normalized;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.storeEmail)) {
    return { success: false, error: "Enter a valid store email address." };
  }

  const numericFields = [
    ["freeShippingThreshold", "Free shipping threshold", MAX_AMOUNT_IN_RUPEES],
    ["defaultShippingRate", "Delivery charge", MAX_AMOUNT_IN_RUPEES],
    ["gstPercentage", "GST percentage", 100],
  ] as const;

  for (const [key, label, maximum] of numericFields) {
    const field = input[key];
    if (
      typeof field !== "number" ||
      !Number.isFinite(field) ||
      field < 0 ||
      field > maximum ||
      (key !== "gstPercentage" && !Number.isSafeInteger(Math.round(field * 100)))
    ) {
      const range = Number.isFinite(maximum) ? `between 0 and ${maximum}` : "0 or more";
      return { success: false, error: `${label} must be a number ${range}.` };
    }
    settings[key] = field;
  }

  if (typeof input.freeShippingEnabled !== "boolean") {
    return { success: false, error: "Free shipping must be enabled or disabled." };
  }
  settings.freeShippingEnabled = input.freeShippingEnabled;

  return { success: true, settings };
}
