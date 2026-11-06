"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { uploadToCloudinary, validateImageFile } from "@/services/cloudinaryService";

interface ProfileForm {
  name: string;
  phone: string;
  photoURL: string;
  photoPublicId: string;
  createdAt: string | null;
}

const emptyProfile: ProfileForm = {
  name: "",
  phone: "",
  photoURL: "",
  photoPublicId: "",
  createdAt: null,
};

function responseMessage(body: unknown, fallback: string): string {
  return body && typeof body === "object" && "error" in body &&
    typeof body.error === "string"
    ? body.error
    : fallback;
}

function formatCreatedAt(value: string | null): string {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
}

export default function AdminProfilePage() {
  const { user, profile, refreshProfile } = useAdminAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ProfileForm>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [profileFeedback, setProfileFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/admin/profile", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const body: unknown = await response.json();
        if (!response.ok) throw new Error(responseMessage(body, "Unable to load your profile."));
        const result = body && typeof body === "object" && "profile" in body
          ? body.profile
          : null;
        if (!result || typeof result !== "object") {
          throw new Error("The server returned an invalid admin profile.");
        }
        const data = result as Record<string, unknown>;
        if (active) {
          setForm({
            name: typeof data.name === "string" ? data.name : "",
            phone: typeof data.phone === "string" ? data.phone : "",
            photoURL: typeof data.photoURL === "string" ? data.photoURL : "",
            photoPublicId: typeof data.photoPublicId === "string" ? data.photoPublicId : "",
            createdAt: typeof data.createdAt === "string" ? data.createdAt : null,
          });
        }
      } catch (error: unknown) {
        if (active) {
          setProfileFeedback({
            type: "error",
            message: error instanceof Error ? error.message : "Unable to load your profile.",
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [user]);

  async function handlePhotoChange(file?: File) {
    if (!file || !user) return;
    const validationError = validateImageFile(file);
    if (validationError) {
      setProfileFeedback({ type: "error", message: validationError });
      return;
    }

    const extension = file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
    const safeFile = new File([file], `profile-${user.uid}-${Date.now()}.${extension}`, {
      type: file.type,
    });

    setUploading(true);
    setUploadProgress(0);
    setProfileFeedback(null);
    try {
      const token = await user.getIdToken();
      const image = await uploadToCloudinary(
        safeFile,
        token,
        setUploadProgress,
        `classic-threads/admin-profiles/${user.uid}`
      );
      setForm((current) => ({
        ...current,
        photoURL: image.url,
        photoPublicId: image.publicId || "",
      }));
      setProfileFeedback({ type: "success", message: "Photo uploaded. Save your profile to apply it." });
    } catch (error: unknown) {
      setProfileFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to upload your profile photo.",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      setProfileFeedback({ type: "error", message: "Your admin session has expired. Sign in again." });
      return;
    }

    setSaving(true);
    setProfileFeedback(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          photoURL: form.photoURL,
          photoPublicId: form.photoPublicId,
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(responseMessage(body, "Unable to save your profile."));
      await refreshProfile();
      setProfileFeedback({ type: "success", message: "Your profile was saved successfully." });
    } catch (error: unknown) {
      setProfileFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to save your profile.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordFeedback(null);
    if (!user || !user.email) {
      setPasswordFeedback({ type: "error", message: "Your admin email is unavailable. Sign in again." });
      return;
    }
    if (!user.providerData.some((provider) => provider.providerId === "password")) {
      setPasswordFeedback({
        type: "error",
        message: "This account does not use email and password sign-in. Use your identity provider to manage its password.",
      });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordFeedback({ type: "error", message: "New password must be at least 8 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: "error", message: "New password and confirmation do not match." });
      return;
    }

    setUpdatingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordFeedback({ type: "success", message: "Password updated successfully." });
    } catch (error: unknown) {
      const code = error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";
      const message = code === "auth/wrong-password" || code === "auth/invalid-credential"
        ? "Current password is incorrect."
        : code === "auth/weak-password"
          ? "Choose a stronger password."
          : error instanceof Error
            ? error.message
            : "Unable to update your password.";
      setPasswordFeedback({ type: "error", message });
    } finally {
      setUpdatingPassword(false);
    }
  }

  const email = user?.email || profile?.email || "";
  const createdAt = form.createdAt;

  if (loading) {
    return (
      <div role="status" className="flex min-h-64 items-center justify-center text-white/60">
        <LoaderCircle className="mr-2 h-5 w-5 animate-spin text-[#ff6500]" />
        Loading admin profile...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ff6500]">Account</p>
        <h1 className="mt-1 text-2xl font-bold text-white">Admin Profile</h1>
        <p className="mt-1 text-sm text-white/50">Manage your profile details and account security.</p>
      </div>

      <section id="profile-information" className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141414]">
        <div className="border-b border-white/[0.07] px-5 py-4 md:px-6">
          <h2 className="font-semibold text-white">Profile information</h2>
          <p className="mt-1 text-xs text-white/45">Your name and phone number are visible to your store team.</p>
        </div>

        <form onSubmit={saveProfile} className="space-y-6 p-5 md:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-white/10 bg-[#202020]">
              {form.photoURL ? (
                <Image src={form.photoURL} alt="Admin profile photo" fill sizes="96px" className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-white/30">
                  <UserRound className="h-10 w-10" />
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-xs font-semibold text-white">
                  {uploadProgress}%
                </div>
              )}
            </div>
            <div className="space-y-2">
              <p className="font-medium text-white">Profile photo</p>
              <p className="max-w-md text-xs leading-relaxed text-white/45">
                JPG, PNG, or WEBP. Maximum file size: 5 MB.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/[0.08] disabled:opacity-50"
                >
                  {uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  {uploading ? "Uploading..." : "Change photo"}
                </button>
                {form.photoURL && (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => {
                      setForm((current) => ({ ...current, photoURL: "", photoPublicId: "" }));
                      setProfileFeedback(null);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 px-3 py-2 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" /> Remove
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  void handlePhotoChange(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-white/60">Full name</span>
              <span className="relative block">
                <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <input
                  required
                  maxLength={120}
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] py-2.5 pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-[#ff6500]/60"
                  placeholder="Your full name"
                />
              </span>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-white/60">Email address</span>
              <span className="relative block">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <input
                  readOnly
                  value={email}
                  className="w-full cursor-not-allowed rounded-lg border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-3 text-sm text-white/50 outline-none"
                />
              </span>
              <span className="block text-[11px] text-white/35">Email changes are managed securely by Firebase Authentication.</span>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-white/60">Phone number</span>
              <span className="relative block">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <input
                  type="tel"
                  maxLength={40}
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] py-2.5 pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-[#ff6500]/60"
                  placeholder="+91 98765 43210"
                />
              </span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-white/[0.07] bg-black/20 p-3">
                <span className="block text-[11px] text-white/40">Account role</span>
                <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-[#ff6500]">
                  <ShieldCheck className="h-4 w-4" /> Administrator
                </span>
              </div>
              <div className="rounded-lg border border-white/[0.07] bg-black/20 p-3">
                <span className="block text-[11px] text-white/40">Account created</span>
                <span className="mt-1 block truncate text-sm font-medium text-white">
                  {formatCreatedAt(createdAt)}
                </span>
              </div>
            </div>
          </div>

          {profileFeedback && (
            <p
              role={profileFeedback.type === "error" ? "alert" : "status"}
              className={`text-sm ${profileFeedback.type === "error" ? "text-red-300" : "text-green-300"}`}
            >
              {profileFeedback.message}
            </p>
          )}

          <button
            type="submit"
            disabled={saving || uploading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#ff6500] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#ff6500]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {saving ? "Saving profile..." : "Save Profile"}
          </button>
        </form>
      </section>

      <section id="password" className="rounded-2xl border border-white/[0.08] bg-[#141414]">
        <div className="border-b border-white/[0.07] px-5 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ff6500]/10 text-[#ff6500]">
              <LockKeyhole className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-semibold text-white">Change password</h2>
              <p className="mt-1 text-xs text-white/45">Confirm your current password before choosing a new one.</p>
            </div>
          </div>
        </div>

        <form onSubmit={changePassword} className="space-y-4 p-5 md:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { label: "Current password", value: currentPassword, update: setCurrentPassword, name: "current-password" },
              { label: "New password", value: newPassword, update: setNewPassword, name: "new-password" },
              { label: "Confirm new password", value: confirmPassword, update: setConfirmPassword, name: "confirm-password" },
            ].map((field) => (
              <label key={field.name} className="space-y-1.5">
                <span className="text-xs font-medium text-white/60">{field.label}</span>
                <span className="relative block">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <input
                    required
                    type={showPasswords ? "text" : "password"}
                    autoComplete={field.name === "current-password" ? "current-password" : "new-password"}
                    value={field.value}
                    onChange={(event) => field.update(event.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] py-2.5 pl-10 pr-10 text-sm text-white outline-none transition-colors focus:border-[#ff6500]/60"
                  />
                  <button
                    type="button"
                    aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
                    onClick={() => setShowPasswords((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-white"
                  >
                    {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>
            ))}
          </div>
          <p className="text-[11px] text-white/40">Use at least 8 characters. Your password is handled by Firebase Authentication and is never stored in Firestore.</p>
          {passwordFeedback && (
            <p
              role={passwordFeedback.type === "error" ? "alert" : "status"}
              className={`text-sm ${passwordFeedback.type === "error" ? "text-red-300" : "text-green-300"}`}
            >
              {passwordFeedback.message}
            </p>
          )}
          <button
            type="submit"
            disabled={updatingPassword}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#ff6500]/40 px-5 py-2.5 text-sm font-semibold text-[#ff6500] transition-colors hover:bg-[#ff6500]/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {updatingPassword ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {updatingPassword ? "Updating password..." : "Update Password"}
          </button>
        </form>
      </section>
    </div>
  );
}
