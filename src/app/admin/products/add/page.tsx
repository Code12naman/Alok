"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { doc, collection, setDoc, serverTimestamp } from "firebase/firestore";
import { adminDb, adminAuth } from "@/firebase/config";
import {
  normalizeProductData,
  sanitizeForFirestore,
  toSlug,
  CloudinaryImage,
} from "@/services/productService";
import { getCategories, FirestoreCategory } from "@/services/categoryService";
import {
  uploadToCloudinary,
  validateImageFile,
  cleanupCloudinaryAssets,
} from "@/services/cloudinaryService";
import {
  FiUpload,
  FiX,
  FiPlus,
  FiLoader,
  FiCheck,
  FiAlertCircle,
  FiImage,
  FiTrash2,
  FiStar,
} from "react-icons/fi";

import Image from "next/image";

type Status = "draft" | "active" | "out_of_stock";

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "One Size"];
const TAG_SUGGESTIONS = [
  "Oversized",
  "Streetwear",
  "Summer",
  "Premium",
  "Limited",
  "Casual",
  "Urban",
  "Drop",
];

interface ImageItem {
  file: File;
  preview: string;
  url?: string;
  publicId?: string;
  progress: number;
  error?: string;
  uploaded: boolean;
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-5">
      <h3 className="font-semibold text-sm text-white/60 uppercase tracking-widest mb-4">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Input({
  label,
  required,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-white/50 mb-1.5">
        {label} {required && <span className="text-[#ff6500]">*</span>}
      </label>
      <input
        {...props}
        className="w-full bg-[#0a0a0a] border border-white/[0.07] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#ff6500]/50 transition-colors"
      />
    </div>
  );
}

function Textarea({
  label,
  required,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-white/50 mb-1.5">
        {label} {required && <span className="text-[#ff6500]">*</span>}
      </label>
      <textarea
        {...props}
        className="w-full bg-[#0a0a0a] border border-white/[0.07] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#ff6500]/50 transition-colors resize-none"
      />
    </div>
  );
}

function Toggle({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <div>
        <p className="text-sm text-white/80 group-hover:text-white transition-colors">
          {label}
        </p>
        {desc && <p className="text-xs text-white/30 mt-0.5">{desc}</p>}
      </div>
      <div
        onClick={() => onChange(!checked)}
        className={`w-10 h-5.5 rounded-full transition-colors relative flex-shrink-0 ${
          checked ? "bg-[#ff6500]" : "bg-white/10"
        }`}
      >
        <span
          className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-all ${
            checked ? "left-5" : "left-0.5"
          }`}
        />
      </div>
    </label>
  );
}

export default function AddProductPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<FirestoreCategory[]>([]);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [thumbnailIndex, setThumbnailIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const [colorInput, setColorInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [customSize, setCustomSize] = useState("");

  const [form, setForm] = useState({
    name: "",
    slug: "",
    sku: "",
    shortDescription: "",
    description: "",
    price: "",
    compareAtPrice: "",
    discountPercentage: "",
    category: "",
    subcategory: "",
    stock: "",
    material: "",
    fit: "",
    careInstructions: "",
    sizes: [] as string[],
    colors: [] as string[],
    tags: [] as string[],
    status: "draft" as Status,
    featured: false,
    newArrival: false,
    trending: false,
    bestSeller: false,
    limitedDrop: false,
  });

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

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
    setImages((prev) => {
      if (prev[i]?.preview?.startsWith("blob:")) {
        URL.revokeObjectURL(prev[i].preview);
      }
      return prev.filter((_, idx) => idx !== i);
    });
    if (thumbnailIndex >= i && thumbnailIndex > 0)
      setThumbnailIndex((t) => t - 1);
  };

  const handleSubmit = async (status: Status) => {
    if (!form.name.trim()) {
      setToast({ type: "error", msg: "Product name is required." });
      return;
    }
    if (!form.price) {
      setToast({ type: "error", msg: "Price is required." });
      return;
    }
    if (!form.stock) {
      setToast({ type: "error", msg: "Stock quantity is required." });
      return;
    }
    if (!form.category) {
      setToast({ type: "error", msg: "Category is required." });
      return;
    }

    const currentUser = adminAuth.currentUser;
    if (!currentUser) {
      console.error("[AddProduct] Firebase auth user is null");
      setToast({
        type: "error",
        msg: "Authentication error: You are not logged in to Firebase.",
      });
      return;
    }

    for (let i = 0; i < images.length; i++) {
      if (images[i].file) {
        const valErr = validateImageFile(images[i].file);
        if (valErr) {
          setToast({
            type: "error",
            msg: `Image #${i + 1} (${images[i].file.name}): ${valErr}`,
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
      const productDocRef = doc(collection(adminDb, "products"));
      const productId = productDocRef.id;

      console.log(
        "[AddProduct] Starting Cloudinary upload sequence for product ID:",
        productId
      );

      const finalImages: CloudinaryImage[] = [];

      for (let i = 0; i < images.length; i++) {
        if (images[i].uploaded && images[i].url) {
          finalImages.push({
            url: images[i].url!,
            publicId: images[i].publicId,
          });
          continue;
        }

        console.log(`[AddProduct] Uploading image ${i + 1}/${images.length}...`);
        setToast({
          type: "success",
          msg: `Uploading image ${i + 1}/${images.length}...`,
        });

        const uploadRes = await uploadToCloudinary(
          images[i].file,
          idToken,
          (pct) => {
            setImages((prev) => {
              const copy = [...prev];
              if (copy[i]) copy[i] = { ...copy[i], progress: pct };
              return copy;
            });
          }
        );

        finalImages.push(uploadRes);
        newlyUploaded.push(uploadRes);

        setImages((prev) => {
          const copy = [...prev];
          if (copy[i])
            copy[i] = {
              ...copy[i],
              url: uploadRes.url,
              publicId: uploadRes.publicId,
              uploaded: true,
              progress: 100,
            };
          return copy;
        });
      }

      const slug = toSlug(form.slug || form.name);
      const selectedThumbnailObj =
        finalImages[thumbnailIndex] || finalImages[0];
      const thumbnail = selectedThumbnailObj ? selectedThumbnailObj.url : "";

      console.log(
        "[AddProduct] Uploads complete. Writing product to Firestore:",
        {
          imagesCount: finalImages.length,
          thumbnail,
        }
      );

      setToast({ type: "success", msg: "Saving product to database..." });

      const normalizedData = normalizeProductData({
        name: form.name.trim(),
        slug,
        sku: form.sku.trim(),
        shortDescription: form.shortDescription.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        subcategory: form.subcategory.trim(),
        price: form.price ? parseFloat(form.price) : 0,
        compareAtPrice: form.compareAtPrice
          ? parseFloat(form.compareAtPrice)
          : undefined,
        discountPercentage: form.discountPercentage
          ? parseFloat(form.discountPercentage)
          : undefined,
        stock: form.stock ? parseInt(form.stock) : 0,
        sizes: form.sizes,
        colors: form.colors,
        material: form.material.trim(),
        fit: form.fit.trim(),
        careInstructions: form.careInstructions.trim(),
        images: finalImages,
        thumbnail,
        tags: form.tags,
        status,
        featured: form.featured,
        newArrival: form.newArrival,
        trending: form.trending,
        bestSeller: form.bestSeller,
        limitedDrop: form.limitedDrop,
      });

      const payload = sanitizeForFirestore({
        ...normalizedData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await setDoc(productDocRef, payload);
      console.log(
        "[AddProduct] Product published successfully with ID:",
        productId
      );

      setToast({
        type: "success",
        msg: `Product "${form.name}" ${
          status === "active" ? "published" : "saved as draft"
        } successfully!`,
      });

      setTimeout(() => router.push("/admin/products"), 1200);
    } catch (err: any) {
      console.error("[AddProduct] Publish failure:", err);
      if (newlyUploaded.length > 0) {
        const token = await currentUser.getIdToken().catch(() => "");
        if (token) {
          console.log(
            "[AddProduct] Cleaning up newly uploaded Cloudinary images..."
          );
          await cleanupCloudinaryAssets(newlyUploaded, token);
        }
      }

      setToast({
        type: "error",
        msg:
          err?.message ||
          "Failed to publish product. Please check console for details.",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleSize = (s: string) => {
    setField(
      "sizes",
      form.sizes.includes(s)
        ? form.sizes.filter((x) => x !== s)
        : [...form.sizes, s]
    );
  };

  const addColor = () => {
    if (colorInput.trim() && !form.colors.includes(colorInput.trim())) {
      setField("colors", [...form.colors, colorInput.trim()]);
      setColorInput("");
    }
  };

  const addTag = (t: string) => {
    if (t.trim() && !form.tags.includes(t.trim())) {
      setField("tags", [...form.tags, t.trim()]);
      setTagInput("");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm ${
            toast.type === "success"
              ? "bg-green-500/15 border border-green-500/30 text-green-400"
              : "bg-red-500/15 border border-red-500/30 text-red-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === "success" ? (
              <FiCheck className="w-5 h-5 flex-shrink-0" />
            ) : (
              <FiAlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span>{toast.msg}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-white/40 hover:text-white"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.07] pb-5">
        <div>
          <h1 className="text-xl font-bold text-white">Add New Product</h1>
          <p className="text-xs text-white/40 mt-0.5">
            Fill in the information below to add a new product to your catalog.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded-lg border border-white/10 text-xs text-white/60 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSubmit("draft")}
            disabled={saving}
            className="px-4 py-2 rounded-lg border border-white/10 text-xs font-semibold text-white/80 hover:text-white hover:border-white/20 transition-colors disabled:opacity-50"
          >
            Save as Draft
          </button>
          <button
            onClick={() => handleSubmit("active")}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-[#ff6500] hover:bg-[#ff6500]/90 text-xs font-bold text-white transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <FiLoader className="w-4 h-4 animate-spin" /> Publishing...
              </>
            ) : (
              "Publish Product"
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <FormSection title="Basic Information">
            <div className="space-y-4">
              <Input
                label="Product Name"
                required
                placeholder="e.g. Urban Oversized Heavyweight Hoodie"
                value={form.name}
                onChange={(e) => {
                  setField("name", e.target.value);
                  if (!form.slug) setField("slug", toSlug(e.target.value));
                }}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="URL Slug"
                  placeholder="urban-oversized-hoodie"
                  value={form.slug}
                  onChange={(e) => setField("slug", toSlug(e.target.value))}
                />
                <Input
                  label="SKU"
                  placeholder="HD-URB-001"
                  value={form.sku}
                  onChange={(e) => setField("sku", e.target.value)}
                />
              </div>

              <Input
                label="Short Description"
                placeholder="Brief summary for product cards and search snippets..."
                value={form.shortDescription}
                onChange={(e) => setField("shortDescription", e.target.value)}
              />

              <Textarea
                label="Full Description"
                rows={5}
                placeholder="Detailed description including design details, story, and styling advice..."
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
              />
            </div>
          </FormSection>

          {/* Media / Images */}
          <FormSection title="Product Images (Cloudinary)">
            <div className="space-y-4">
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-white/10 hover:border-[#ff6500]/50 rounded-xl p-8 text-center cursor-pointer transition-colors bg-[#0a0a0a]/50 group"
              >
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <div className="w-12 h-12 rounded-full bg-white/5 group-hover:bg-[#ff6500]/10 flex items-center justify-center mx-auto mb-3 text-white/40 group-hover:text-[#ff6500] transition-colors">
                  <FiUpload className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors">
                  Click or drag images to upload
                </p>
                <p className="text-xs text-white/30 mt-1">
                  Supports JPG, PNG, WEBP up to 5 MB each.
                </p>
              </div>

              {images.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-white/40">
                    <span>
                      {images.length} image{images.length > 1 ? "s" : ""} selected
                    </span>
                    <span>Click the star icon to set primary thumbnail</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {images.map((img, i) => (
                      <div
                        key={i}
                        className={`relative aspect-square rounded-xl overflow-hidden bg-[#0a0a0a] border-2 transition-all group ${
                          thumbnailIndex === i
                            ? "border-[#ff6500]"
                            : "border-white/10 hover:border-white/30"
                        }`}
                      >
                        <Image
                          src={img.url || img.preview}
                          alt={`Preview ${i + 1}`}
                          fill
                          className="object-cover"
                        />

                        {img.progress > 0 && img.progress < 100 && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2">
                            <div className="w-full text-center space-y-1">
                              <FiLoader className="w-5 h-5 text-[#ff6500] animate-spin mx-auto" />
                              <span className="text-[10px] text-white font-bold">
                                {img.progress}%
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between p-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setThumbnailIndex(i);
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${
                              thumbnailIndex === i
                                ? "bg-[#ff6500] text-white"
                                : "bg-black/60 text-white/60 hover:text-white"
                            }`}
                            title="Set as Thumbnail"
                          >
                            <FiStar className="w-3.5 h-3.5 fill-current" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImage(i);
                            }}
                            className="p-1.5 rounded-lg bg-black/60 text-white/60 hover:text-red-400 transition-colors"
                            title="Remove image"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {thumbnailIndex === i && (
                          <span className="absolute bottom-1.5 left-1.5 bg-[#ff6500] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                            THUMBNAIL
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </FormSection>

          {/* Pricing & Stock */}
          <FormSection title="Pricing & Inventory">
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Selling Price (₹)"
                  required
                  type="number"
                  placeholder="1499"
                  value={form.price}
                  onChange={(e) => setField("price", e.target.value)}
                />
                <Input
                  label="Compare At Price (₹)"
                  type="number"
                  placeholder="2499"
                  value={form.compareAtPrice}
                  onChange={(e) => setField("compareAtPrice", e.target.value)}
                />
                <Input
                  label="Discount (%)"
                  type="number"
                  placeholder="40"
                  value={form.discountPercentage}
                  onChange={(e) => setField("discountPercentage", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Stock Quantity"
                  required
                  type="number"
                  placeholder="50"
                  value={form.stock}
                  onChange={(e) => setField("stock", e.target.value)}
                />
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">
                    Product Status <span className="text-[#ff6500]">*</span>
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setField("status", e.target.value as Status)}
                    className="w-full bg-[#0a0a0a] border border-white/[0.07] rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#ff6500]/50 transition-colors"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active (Published)</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                </div>
              </div>
            </div>
          </FormSection>

          {/* Specifications */}
          <FormSection title="Specifications & Fit">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Material"
                  placeholder="100% French Terry Cotton, 380 GSM"
                  value={form.material}
                  onChange={(e) => setField("material", e.target.value)}
                />
                <Input
                  label="Fit Type"
                  placeholder="Oversized Boxy Fit"
                  value={form.fit}
                  onChange={(e) => setField("fit", e.target.value)}
                />
              </div>
              <Input
                label="Care Instructions"
                placeholder="Machine wash cold inside out, hang dry"
                value={form.careInstructions}
                onChange={(e) => setField("careInstructions", e.target.value)}
              />
            </div>
          </FormSection>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* Organization */}
          <FormSection title="Category & Details">
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-white/50 mb-1.5">
                  Category <span className="text-[#ff6500]">*</span>
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setField("category", e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/[0.07] rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#ff6500]/50 transition-colors"
                >
                  <option value="">Select a Category</option>
                  {categories.map((c) => (
                    <option key={c.id || c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                  <option value="Hoodies">Hoodies</option>
                  <option value="T-Shirts">T-Shirts</option>
                  <option value="Pants">Pants</option>
                  <option value="Jackets">Jackets</option>
                  <option value="Accessories">Accessories</option>
                </select>
              </div>

              <Input
                label="Subcategory (Optional)"
                placeholder="Zip Hoodies"
                value={form.subcategory}
                onChange={(e) => setField("subcategory", e.target.value)}
              />
            </div>
          </FormSection>

          {/* Sizes */}
          <FormSection title="Available Sizes">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {SIZE_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSize(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      form.sizes.includes(s)
                        ? "bg-[#ff6500] border-[#ff6500] text-white"
                        : "border-white/10 text-white/50 hover:text-white hover:border-white/20"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Custom size..."
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  className="flex-1 bg-[#0a0a0a] border border-white/[0.07] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-[#ff6500]/50"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (
                      customSize.trim() &&
                      !form.sizes.includes(customSize.trim())
                    ) {
                      setField("sizes", [...form.sizes, customSize.trim()]);
                      setCustomSize("");
                    }
                  }}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold rounded-lg text-white"
                >
                  Add
                </button>
              </div>
            </div>
          </FormSection>

          {/* Colors */}
          <FormSection title="Colors">
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add color (e.g. Acid Black)..."
                  value={colorInput}
                  onChange={(e) => setColorInput(e.target.value)}
                  className="flex-1 bg-[#0a0a0a] border border-white/[0.07] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-[#ff6500]/50"
                />
                <button
                  type="button"
                  onClick={addColor}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold rounded-lg text-white"
                >
                  Add
                </button>
              </div>

              {form.colors.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.colors.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1 bg-white/5 border border-white/10 px-2.5 py-1 rounded-md text-xs text-white/80"
                    >
                      {c}
                      <button
                        type="button"
                        onClick={() =>
                          setField(
                            "colors",
                            form.colors.filter((x) => x !== c)
                          )
                        }
                        className="hover:text-red-400"
                      >
                        <FiX className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </FormSection>

          {/* Tags */}
          <FormSection title="Tags & Badges">
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  className="flex-1 bg-[#0a0a0a] border border-white/[0.07] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-[#ff6500]/50"
                />
                <button
                  type="button"
                  onClick={() => addTag(tagInput)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold rounded-lg text-white"
                >
                  Add
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {TAG_SUGGESTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => addTag(t)}
                    className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                      form.tags.includes(t)
                        ? "bg-[#ff6500]/20 border-[#ff6500]/40 text-[#ff6500]"
                        : "border-white/5 text-white/30 hover:text-white/60"
                    }`}
                  >
                    + {t}
                  </button>
                ))}
              </div>

              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {form.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 bg-[#ff6500]/15 border border-[#ff6500]/30 px-2.5 py-1 rounded-md text-xs text-[#ff6500]"
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() =>
                          setField(
                            "tags",
                            form.tags.filter((x) => x !== t)
                          )
                        }
                        className="hover:text-red-400"
                      >
                        <FiX className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </FormSection>

          {/* Visibility Badges */}
          <FormSection title="Storefront Collections">
            <div className="space-y-3">
              <Toggle
                label="Featured Product"
                desc="Show on homepage hero & featured section"
                checked={form.featured}
                onChange={(v) => setField("featured", v)}
              />
              <Toggle
                label="New Arrival"
                desc="Mark as new collection drop"
                checked={form.newArrival}
                onChange={(v) => setField("newArrival", v)}
              />
              <Toggle
                label="Trending"
                desc="Display in trending products feed"
                checked={form.trending}
                onChange={(v) => setField("trending", v)}
              />
              <Toggle
                label="Best Seller"
                desc="Include in bestseller section"
                checked={form.bestSeller}
                onChange={(v) => setField("bestSeller", v)}
              />
              <Toggle
                label="Limited Drop"
                desc="Highlight as exclusive limited edition"
                checked={form.limitedDrop}
                onChange={(v) => setField("limitedDrop", v)}
              />
            </div>
          </FormSection>
        </div>
      </div>
    </div>
  );
}
