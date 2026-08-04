"use client";

import { useState, useEffect } from "react";
import {
  getCategories,
  addCategory,
  deleteCategory,
  updateCategory,
  FirestoreCategory,
} from "@/services/categoryService";
import {
  uploadToCloudinary,
  deleteCloudinaryAsset,
  validateImageFile,
} from "@/services/cloudinaryService";
import { auth } from "@/firebase/config";
import { FiPlus, FiTrash2, FiEdit2, FiLoader, FiCheck, FiX, FiTag } from "react-icons/fi";
import { SafeImage } from "@/components/ui/SafeImage";

const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, timeoutMsg: string): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutMsg));
    }, timeoutMs);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<FirestoreCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const rawCategories = await getCategories();
      // Remove duplicate categories by slug or name
      const uniqueCats = Array.from(
        new Map(
          rawCategories.map((cat) => [(cat.slug || cat.name).toLowerCase(), cat])
        ).values()
      );
      setCategories(uniqueCats);
    } catch (err) {
      console.error("[Category] Failed to load categories:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setName("");
    setDescription("");
    setImageFile(null);
    setEditId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    setSaving(true);
    let uploadedPublicId: string | undefined = undefined;
    let currentIdToken = "";

    try {
      console.log("[Category] Starting category creation");

      let imageUrl = editId ? categories.find((c) => c.id === editId)?.image : undefined;
      let imagePublicId = editId ? categories.find((c) => c.id === editId)?.imagePublicId : undefined;

      if (imageFile) {
        console.log("[Category] Image selected:", imageFile.name);

        // Pre-upload validation
        const valError = validateImageFile(imageFile);
        if (valError) {
          console.error("[Category Error] File validation failed:", valError);
          setToast(`Validation Error: ${valError}`);
          return;
        }

        const currentUser = auth.currentUser;
        if (!currentUser) {
          console.error("[Category Error] No authenticated Firebase user found.");
          setToast("Authentication error: You are not logged in as an admin user.");
          return;
        }

        currentIdToken = await currentUser.getIdToken();

        console.log("[Category] Requesting Cloudinary signature");
        console.log("[Category] Signature received");
        console.log("[Category] Uploading image");

        const uploadRes = await withTimeout(
          uploadToCloudinary(imageFile, currentIdToken, undefined, "street-mode/categories"),
          30000,
          "Image upload timed out after 30 seconds. Please check your network connection."
        );

        console.log("[Category] Cloudinary upload successful");
        console.log("[Category] secure_url:", uploadRes.url);
        imageUrl = uploadRes.url;
        imagePublicId = uploadRes.publicId;
        uploadedPublicId = uploadRes.publicId;
      } else {
        console.log("[Category] No image selected");
      }

      console.log("[Category] Saving Firestore document");

      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

      if (editId) {
        await updateCategory(editId, {
          name: name.trim(),
          slug,
          description: description.trim(),
          image: imageUrl,
          imagePublicId: imagePublicId,
          active: true,
        });
        console.log("[Category] Category updated successfully");
        setToast("Category updated!");
      } else {
        await addCategory({
          name: name.trim(),
          slug,
          description: description.trim(),
          image: imageUrl,
          imagePublicId: imagePublicId,
          active: true,
        });
        console.log("[Category] Category created successfully");
        setToast("Category added!");
      }

      resetForm();
      await load();
      setTimeout(() => setToast(""), 3000);
    } catch (error: any) {
      console.error("[Category Upload Error]", error);
      const errorMsg = error?.message || "Failed to save category. Please check permissions.";
      setToast(errorMsg);

      // Clean up orphan Cloudinary asset if Firestore save failed after image upload
      if (uploadedPublicId && currentIdToken) {
        console.log(`[Category] Cleaning up orphaned Cloudinary asset (${uploadedPublicId})...`);
        try {
          await deleteCloudinaryAsset(uploadedPublicId, currentIdToken);
          console.log("[Category] Orphaned Cloudinary asset deleted successfully.");
        } catch (cleanupErr) {
          console.error("[Category] Failed to delete orphaned Cloudinary asset:", cleanupErr);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (cat: FirestoreCategory) => {
    setEditId(cat.id!);
    setName(cat.name);
    setDescription(cat.description || "");
    setImageFile(null);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const catToDelete = categories.find((c) => c.id === deleteId);
      if (catToDelete?.imagePublicId && auth.currentUser) {
        const idToken = await auth.currentUser.getIdToken();
        deleteCloudinaryAsset(catToDelete.imagePublicId, idToken).catch(() => {});
      }
      await deleteCategory(deleteId);
      setCategories((prev) => prev.filter((c) => c.id !== deleteId));
    } catch (err) {
      console.error("[Category Error] Failed to delete category:", err);
      alert("Failed to delete category.");
    }
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#FFFFFF] border border-[#E6E6E3] rounded-3xl p-6 md:p-8 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#111111]">Store Categories</h1>
          <p className="text-xs text-gray-500 font-medium mt-1">Manage storefront product categories ({categories.length} active)</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 bg-[#F4512C] hover:bg-[#DD3F1E] text-white px-6 py-3 rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
        >
          <FiPlus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {toast && (
        <div
          className={`border rounded-2xl p-4 text-xs font-bold shadow-xs ${
            toast.toLowerCase().includes("fail") ||
            toast.toLowerCase().includes("error") ||
            toast.toLowerCase().includes("validation")
              ? "bg-red-50 border-red-200 text-red-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          {toast}
        </div>
      )}

      {showForm && (
        <div className="bg-[#FFFFFF] border border-[#E6E6E3] rounded-3xl p-6 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-[#111111]">{editId ? "Edit Category" : "Add New Category"}</h3>
          <div className="space-y-4 max-w-md">
            <div>
              <label className="text-xs font-bold text-[#111111] block mb-1.5">Category Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Footwear"
                className="w-full bg-[#F7F7F5] border border-[#E6E6E3] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#111111] placeholder:text-gray-400 focus:outline-none focus:border-[#F4512C]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#111111] block mb-1.5">Description</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional collection description"
                className="w-full bg-[#F7F7F5] border border-[#E6E6E3] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#111111] placeholder:text-gray-400 focus:outline-none focus:border-[#F4512C]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#111111] block mb-1.5">Banner Image</label>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="text-xs text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-[#F7F7F5] file:text-[#111111] file:font-bold file:text-xs hover:file:bg-[#E6E6E3]"
              />
              {imageFile && (
                <p className="text-[11px] font-semibold text-emerald-600 mt-1">
                  Selected: {imageFile.name} ({(imageFile.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="flex items-center gap-2 bg-[#F4512C] hover:bg-[#DD3F1E] text-white px-5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-60 transition-colors shadow-xs cursor-pointer"
              >
                {saving ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiCheck className="w-4 h-4" />}
                {saving ? "Saving..." : editId ? "Update Category" : "Save Category"}
              </button>
              <button
                onClick={resetForm}
                disabled={saving}
                className="flex items-center gap-1.5 text-gray-600 hover:text-[#111111] px-4 py-2.5 rounded-xl text-xs font-bold border border-[#E6E6E3] hover:bg-[#F7F7F5] transition-colors cursor-pointer disabled:opacity-50"
              >
                <FiX className="w-4 h-4" /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-[#FFFFFF] border border-[#E6E6E3] rounded-3xl p-16 flex items-center justify-center shadow-xs">
          <FiLoader className="w-8 h-8 text-[#F4512C] animate-spin" />
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-[#FFFFFF] border border-[#E6E6E3] rounded-3xl p-16 text-center shadow-xs">
          <div className="h-16 w-16 bg-[#F7F7F5] rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
            <FiTag className="w-8 h-8" />
          </div>
          <p className="text-xs text-gray-500 font-bold mb-3">No categories defined yet.</p>
          <button onClick={() => setShowForm(true)} className="text-[#F4512C] text-xs font-bold hover:underline">
            Add your first category →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <div
              key={cat.id || cat.slug || cat.name}
              className="bg-[#FFFFFF] border border-[#E6E6E3] rounded-3xl overflow-hidden shadow-xs hover:border-[#F4512C]/40 transition-all group"
            >
              {cat.image && (
                <div className="relative h-32 w-full bg-[#F7F7F5]">
                  <SafeImage src={cat.image} alt={cat.name} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <span className="absolute bottom-3 left-4 text-white font-extrabold text-base tracking-tight">
                    {cat.name}
                  </span>
                </div>
              )}
              <div className="p-5 flex items-center justify-between gap-3">
                {!cat.image && (
                  <div>
                    <p className="font-extrabold text-sm text-[#111111]">{cat.name}</p>
                    {cat.description && <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{cat.description}</p>}
                  </div>
                )}
                {cat.image && (
                  <p className="text-xs text-gray-500 font-medium line-clamp-1 flex-1">
                    {cat.description || "Active storefront category"}
                  </p>
                )}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => startEdit(cat)} className="p-2 text-gray-500 hover:text-[#111111] hover:bg-[#F7F7F5] rounded-xl transition-colors">
                    <FiEdit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteId(cat.id!)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E6E6E3] rounded-3xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-extrabold text-base text-[#111111] mb-2">Delete Category?</h3>
            <p className="text-gray-500 text-xs mb-6 leading-relaxed">This will delete the category entry from Firestore. Associated products will remain untouched.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 border border-[#E6E6E3] rounded-xl py-2.5 text-xs font-bold text-gray-700 hover:bg-[#F7F7F5] transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-700 rounded-xl py-2.5 text-xs font-bold text-white transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
