"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  getProductById,
  updateProduct,
  FirestoreProduct,
  CloudinaryImage,
  getImageUrl,
  getImagePublicId,
} from "@/services/productService";
import { adminAuth, adminDb } from "@/firebase/config";
import { getCategories, FirestoreCategory } from "@/services/categoryService";
import {
  uploadToCloudinary,
  validateImageFile,
  deleteCloudinaryAsset,
  cleanupCloudinaryAssets,
} from "@/services/cloudinaryService";
import {
  FiLoader,
  FiCheck,
  FiAlertCircle,
  FiStar,
  FiTrash2,
  FiImage,
  FiX,
  FiUpload,
} from "react-icons/fi";
import Image from "next/image";

interface ImageItem {
  file?: File;
  preview: string;
  url?: string;
  publicId?: string;
  progress: number;
  uploaded: boolean;
}

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<FirestoreCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [removedPublicIds, setRemovedPublicIds] = useState<string[]>([]);
  const [thumbnailIndex, setThumbnailIndex] = useState(0);
  const [colorInput, setColorInput] = useState("");
  const [tagInput, setTagInput] = useState("");

  const [form, setForm] = useState<Partial<FirestoreProduct>>({
    name: "",
    slug: "",
    sku: "",
    shortDescription: "",
    description: "",
    price: 0,
    compareAtPrice: undefined,
    stock: 0,
    category: "",
    subcategory: "",
    material: "",
    fit: "",
    sizes: [],
    colors: [],
    tags: [],
    status: "draft",
    featured: false,
    newArrival: false,
    trending: false,
    bestSeller: false,
    limitedDrop: false,
  });

  useEffect(() => {
    Promise.all([getProductById(id), getCategories()])
      .then(([product, cats]) => {
        if (product) {
          setForm(product);
          const imgs: ImageItem[] = (product.images || []).map((imgItem) => {
            const url = getImageUrl(imgItem);
            const publicId = getImagePublicId(imgItem) || undefined;
            return {
              preview: url,
              url,
              publicId,
              progress: 100,
              uploaded: true,
            };
          });
          setImages(imgs);
          const thumbUrl = getImageUrl(product.thumbnail);
          const thumbIdx = thumbUrl
            ? imgs.findIndex((i) => i.url === thumbUrl)
            : 0;
          setThumbnailIndex(Math.max(0, thumbIdx));
        }
        setCategories(cats);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    return () => {
      images.forEach((img) => {
        if (img.preview && img.preview.startsWith("blob:")) {
          URL.revokeObjectURL(img.preview);
        }
      });
    };
  }, [images]);

  const setField = (key: string, value: any) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newItems: ImageItem[] = [];

    Array.from(files).forEach((file) => {
      const valErr = validateImageFile(file);
      if (valErr) {
        setToast({ type: "error", msg: `"${file.name}": ${valErr}` });
        return;
      }
      newItems.push({
        file,
        preview: URL.createObjectURL(file),
        progress: 0,
        uploaded: false,
      });
    });

    if (newItems.length > 0) {
      setImages((prev) => [...prev, ...newItems]);
    }
  };

  const removeImage = (i: number) => {
    const target = images[i];
    if (target?.publicId) {
      setRemovedPublicIds((prev) => [...prev, target.publicId!]);
    }
    if (target?.preview?.startsWith("blob:")) {
      URL.revokeObjectURL(target.preview);
    }
    setImages((prev) => prev.filter((_, idx) => idx !== i));
    if (thumbnailIndex >= i && thumbnailIndex > 0)
      setThumbnailIndex((t) => t - 1);
  };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.category) {
      setToast({
        type: "error",
        msg: "Name, price, and category are required.",
      });
      return;
    }

    const currentUser = adminAuth.currentUser;
    if (!currentUser) {
      console.error("[EditProduct] Firebase auth user is null");
      setToast({
        type: "error",
        msg: "Authentication error: You are not signed in to Firebase.",
      });
      return;
    }

    for (let i = 0; i < images.length; i++) {
      if (images[i].file) {
        const valErr = validateImageFile(images[i].file!);
        if (valErr) {
          setToast({
            type: "error",
            msg: `Image #${i + 1} (${images[i].file!.name}): ${valErr}`,
          });
          return;
        }
      }
    }

    setSaving(true);
    setToast(null);

    const newlyUploaded: CloudinaryImage[] = [];

    try {
      const idToken = await currentUser.getIdToken();
      const finalImages: CloudinaryImage[] = [];

      for (let i = 0; i < images.length; i++) {
        if (images[i].uploaded && images[i].url) {
          finalImages.push({
            url: images[i].url!,
            publicId: images[i].publicId,
          });
          continue;
        }
        if (!images[i].file) continue;

        console.log(
          `[EditProduct] Uploading new image ${i + 1}/${images.length} to Cloudinary...`
        );
        setToast({
          type: "success",
          msg: `Uploading image ${i + 1}/${images.length}...`,
        });

        const uploadRes = await uploadToCloudinary(
          images[i].file!,
          idToken,
          (pct) => {
            setImages((prev) => {
              const c = [...prev];
              if (c[i]) c[i] = { ...c[i], progress: pct };
              return c;
            });
          }
        );

        finalImages.push(uploadRes);
        newlyUploaded.push(uploadRes);

        setImages((prev) => {
          const c = [...prev];
          if (c[i])
            c[i] = {
              ...c[i],
              url: uploadRes.url,
              publicId: uploadRes.publicId,
              uploaded: true,
              progress: 100,
            };
          return c;
        });
      }

      const selectedThumbObj =
        finalImages[thumbnailIndex] || finalImages[0];
      const thumbnail = selectedThumbObj ? selectedThumbObj.url : "";

      await updateProduct(id, {
        ...form,
        images: finalImages,
        thumbnail,
      } as Partial<FirestoreProduct>, adminDb);

      // Delete removed Cloudinary assets on successful save
      if (removedPublicIds.length > 0) {
        console.log(
          `[EditProduct] Deleting ${removedPublicIds.length} removed Cloudinary assets...`
        );
        await Promise.allSettled(
          removedPublicIds.map((pid) => deleteCloudinaryAsset(pid, idToken))
        );
      }

      setToast({ type: "success", msg: "Product updated successfully!" });
      setTimeout(() => router.push("/admin/products"), 1000);
    } catch (err: any) {
      console.error("[EditProduct] Error updating product:", err);
      if (newlyUploaded.length > 0) {
        const token = await currentUser.getIdToken().catch(() => "");
        if (token) {
          await cleanupCloudinaryAssets(newlyUploaded, token);
        }
      }
      setToast({
        type: "error",
        msg: err?.message || "Failed to update product.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <FiLoader className="w-8 h-8 text-[#ff6500] animate-spin" />
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Edit Product</h1>
        <button
          onClick={() => router.back()}
          className="text-white/40 hover:text-white text-sm transition-colors"
        >
          ← Back
        </button>
      </div>

      {toast && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border text-sm ${
            toast.type === "success"
              ? "bg-green-500/10 border-green-500/20 text-green-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}
        >
          {toast.type === "success" ? (
            <FiCheck className="w-4 h-4" />
          ) : (
            <FiAlertCircle className="w-4 h-4" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Form Fields */}
      <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-xs text-white/50 mb-1">
            Product Name *
          </label>
          <input
            value={form.name || ""}
            onChange={(e) => setField("name", e.target.value)}
            className="w-full bg-[#0a0a0a] border border-white/[0.07] rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#ff6500]/50"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-white/50 mb-1">Price (₹) *</label>
            <input
              type="number"
              value={form.price || ""}
              onChange={(e) => setField("price", Number(e.target.value))}
              className="w-full bg-[#0a0a0a] border border-white/[0.07] rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#ff6500]/50"
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Category *</label>
            <select
              value={form.category || ""}
              onChange={(e) => setField("category", e.target.value)}
              className="w-full bg-[#0a0a0a] border border-white/[0.07] rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#ff6500]/50"
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id || c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-white/50 mb-1">Stock</label>
            <input
              type="number"
              value={form.stock || 0}
              onChange={(e) => setField("stock", Number(e.target.value))}
              className="w-full bg-[#0a0a0a] border border-white/[0.07] rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#ff6500]/50"
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Status</label>
            <select
              value={form.status || "draft"}
              onChange={(e) => setField("status", e.target.value)}
              className="w-full bg-[#0a0a0a] border border-white/[0.07] rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#ff6500]/50"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1">
            Description
          </label>
          <textarea
            rows={4}
            value={form.description || ""}
            onChange={(e) => setField("description", e.target.value)}
            className="w-full bg-[#0a0a0a] border border-white/[0.07] rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#ff6500]/50 resize-none"
          />
        </div>

        {/* Media / Images */}
        <div className="pt-2">
          <label className="block text-xs text-white/50 mb-2">
            Product Images (Cloudinary)
          </label>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-white/10 hover:border-[#ff6500]/50 rounded-xl p-6 text-center cursor-pointer transition-colors bg-[#0a0a0a]/50"
          >
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <FiUpload className="w-5 h-5 text-white/40 mx-auto mb-2" />
            <p className="text-xs font-semibold text-white/70">
              Click to select additional product images
            </p>
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
              {images.map((img, i) => (
                <div
                  key={i}
                  className={`relative aspect-square rounded-xl overflow-hidden bg-[#0a0a0a] border-2 group ${
                    thumbnailIndex === i
                      ? "border-[#ff6500]"
                      : "border-white/10"
                  }`}
                >
                  <Image
                    src={img.url || img.preview}
                    alt={`Product ${i + 1}`}
                    fill
                    className="object-cover"
                  />
                  {img.progress > 0 && img.progress < 100 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <FiLoader className="w-5 h-5 text-[#ff6500] animate-spin" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between p-2">
                    <button
                      type="button"
                      onClick={() => setThumbnailIndex(i)}
                      className={`p-1.5 rounded-lg ${
                        thumbnailIndex === i
                          ? "bg-[#ff6500] text-white"
                          : "bg-black/60 text-white/60 hover:text-white"
                      }`}
                    >
                      <FiStar className="w-3.5 h-3.5 fill-current" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="p-1.5 rounded-lg bg-black/60 text-white/60 hover:text-red-400"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 border border-white/10 rounded-lg text-sm text-white/60 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-[#ff6500] hover:bg-[#ff6500]/90 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <>
              <FiLoader className="w-4 h-4 animate-spin" /> Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </button>
      </div>
    </div>
  );
}
