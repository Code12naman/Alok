"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { addProduct, FirestoreProduct } from "@/services/productService";
import { auth } from "@/firebase/config";
import { getCategories, FirestoreCategory } from "@/services/categoryService";
import { uploadFile } from "@/services/storageService";
import {
  FiUpload, FiX, FiPlus, FiLoader, FiCheck, FiAlertCircle,
  FiImage, FiTrash2, FiStar
} from "react-icons/fi";
import Image from "next/image";

type Status = "draft" | "active" | "out_of_stock";

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "One Size"];
const TAG_SUGGESTIONS = ["Oversized", "Streetwear", "Summer", "Premium", "Limited", "Casual", "Urban", "Drop"];

interface ImageItem {
  file: File;
  preview: string;
  url?: string;
  progress: number;
  error?: string;
  uploaded: boolean;
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-5">
      <h3 className="font-semibold text-sm text-white/60 uppercase tracking-widest mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Input({ label, required, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; required?: boolean }) {
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

function Textarea({ label, required, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; required?: boolean }) {
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

function Toggle({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <div>
        <p className="text-sm text-white/80 group-hover:text-white transition-colors">{label}</p>
        {desc && <p className="text-xs text-white/30 mt-0.5">{desc}</p>}
      </div>
      <div
        onClick={() => onChange(!checked)}
        className={`w-10 h-5.5 rounded-full transition-colors relative flex-shrink-0 ${checked ? "bg-[#ff6500]" : "bg-white/10"}`}
      >
        <span className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-all ${checked ? "left-5" : "left-0.5"}`} />
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
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
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
    getCategories().then(setCategories).catch(() => {});
  }, []);

  const setField = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newImages: ImageItem[] = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
      uploaded: false,
    }));
    setImages((prev) => [...prev, ...newImages]);
  };

  const removeImage = (i: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[i].preview);
      const next = prev.filter((_, idx) => idx !== i);
      return next;
    });
    if (thumbnailIndex >= i && thumbnailIndex > 0) setThumbnailIndex((t) => t - 1);
  };

  const uploadImages = async (productId: string): Promise<string[]> => {
    const urls: string[] = [];
    for (let i = 0; i < images.length; i++) {
      if (images[i].uploaded && images[i].url) {
        urls.push(images[i].url!);
        continue;
      }
      try {
        const url = await uploadFile(images[i].file, `products/${productId}`, (pct) => {
          setImages((prev) => {
            const copy = [...prev];
            copy[i] = { ...copy[i], progress: pct };
            return copy;
          });
        });
        urls.push(url);
        setImages((prev) => {
          const copy = [...prev];
          copy[i] = { ...copy[i], url, uploaded: true, progress: 100 };
          return copy;
        });
      } catch (err: any) {
        console.error("STORAGE UPLOAD ERROR:", err);
        setImages((prev) => {
          const copy = [...prev];
          copy[i] = { ...copy[i], error: err?.message || "Upload failed" };
          return copy;
        });
        throw new Error(`Firebase Storage Upload Error: ${err?.message || "Unknown storage failure"}`);
      }
    }
    return urls;
  };

  const handleSubmit = async (status: Status) => {
    if (!form.name) { setToast({ type: "error", msg: "Product name is required." }); return; }
    if (!form.price) { setToast({ type: "error", msg: "Price is required." }); return; }
    if (!form.stock) { setToast({ type: "error", msg: "Stock quantity is required." }); return; }
    if (!form.category) { setToast({ type: "error", msg: "Category is required." }); return; }

    if (!auth.currentUser) {
      console.error("PRODUCT SAVE ERROR: Firebase auth user is null");
      setToast({ type: "error", msg: "Authentication error: You are not signed in to Firebase." });
      return;
    }

    setSaving(true);
    setToast(null);

    try {
      const slug = form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const tempId = `temp-${Date.now()}`;
      const imageUrls = await uploadImages(tempId);
      const thumbnail = imageUrls[thumbnailIndex] || imageUrls[0] || "";

      const productData: Partial<FirestoreProduct> = {
        name: form.name.trim(),
        slug,
        sku: form.sku.trim(),
        shortDescription: form.shortDescription.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        subcategory: form.subcategory.trim(),
        price: form.price ? parseFloat(form.price) : 0,
        compareAtPrice: form.compareAtPrice ? parseFloat(form.compareAtPrice) : undefined,
        discountPercentage: form.discountPercentage ? parseFloat(form.discountPercentage) : undefined,
        stock: form.stock ? parseInt(form.stock) : 0,
        sizes: form.sizes,
        colors: form.colors,
        material: form.material.trim(),
        fit: form.fit.trim(),
        careInstructions: form.careInstructions.trim(),
        images: imageUrls,
        thumbnail,
        tags: form.tags,
        status,
        featured: form.featured,
        newArrival: form.newArrival,
        trending: form.trending,
        bestSeller: form.bestSeller,
        limitedDrop: form.limitedDrop,
      };

      await addProduct(productData as Omit<FirestoreProduct, "id">);
      setToast({ type: "success", msg: `Product ${status === "active" ? "published" : "saved as draft"} successfully!` });
      setTimeout(() => router.push("/admin/products"), 1200);
    } catch (e: any) {
      console.error("PRODUCT SAVE ERROR:", e?.code, e?.message, e);
      setToast({
        type: "error",
        msg: e?.message || "Failed to save product. Please check console for details."
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleSize = (s: string) => {
    setField("sizes", form.sizes.includes(s) ? form.sizes.filter((x) => x !== s) : [...form.sizes, s]);
  };

  const addColor = () => {
    if (colorInput.trim() && !form.colors.includes(colorInput.trim())) {
      setField("colors", [...form.colors, colorInput.trim()]);
      setColorInput("");
    }
  };

  const addTag = (t: string) => {
    if (t.trim() && !form.tags.includes(t.trim())) setField("tags", [...form.tags, t.trim()]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Add New Product</h1>
          <p className="text-white/40 text-sm mt-0.5">Fill in the details and publish.</p>
        </div>
        <button onClick={() => router.back()} className="text-white/40 hover:text-white text-sm transition-colors">
          ← Back
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border text-sm ${toast.type === "success" ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
          {toast.type === "success" ? <FiCheck className="w-4 h-4 flex-shrink-0" /> : <FiAlertCircle className="w-4 h-4 flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT - Main form */}
        <div className="lg:col-span-2 space-y-5">
          <FormSection title="Basic Information">
            <div className="space-y-4">
              <Input label="Product Name" required value={form.name} onChange={e => setField("name", e.target.value)} placeholder="e.g. Oversized Canvas Bomber" />
              <Input label="Short Description" value={form.shortDescription} onChange={e => setField("shortDescription", e.target.value)} placeholder="Brief one-liner for product listings" />
              <Textarea label="Full Description" value={form.description} onChange={e => setField("description", e.target.value)} placeholder="Full product description..." rows={4} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="SKU" value={form.sku} onChange={e => setField("sku", e.target.value)} placeholder="SM-001" />
                <Input label="URL Slug" value={form.slug} onChange={e => setField("slug", e.target.value)} placeholder="auto-generated" />
              </div>
            </div>
          </FormSection>

          <FormSection title="Pricing">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input label="Regular Price (₹)" required type="number" value={form.price} onChange={e => setField("price", e.target.value)} placeholder="0" />
              <Input label="Compare At Price (₹)" type="number" value={form.compareAtPrice} onChange={e => setField("compareAtPrice", e.target.value)} placeholder="0" />
              <Input label="Discount %" type="number" value={form.discountPercentage} onChange={e => setField("discountPercentage", e.target.value)} placeholder="0" />
            </div>
          </FormSection>

          <FormSection title="Category">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/50 mb-1.5">Category <span className="text-[#ff6500]">*</span></label>
                <select value={form.category} onChange={e => setField("category", e.target.value)} className="w-full bg-[#0a0a0a] border border-white/[0.07] rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#ff6500]/50">
                  <option value="">Select category...</option>
                  {categories.length > 0 ? categories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  )) : (
                    <>
                      <option>T-Shirts</option>
                      <option>Hoodies</option>
                      <option>Jackets</option>
                      <option>Cargo Pants</option>
                      <option>Shorts</option>
                      <option>Accessories</option>
                    </>
                  )}
                </select>
              </div>
              <Input label="Subcategory" value={form.subcategory} onChange={e => setField("subcategory", e.target.value)} placeholder="e.g. Graphic Tees" />
            </div>
          </FormSection>

          <FormSection title="Inventory">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Stock Quantity" required type="number" value={form.stock} onChange={e => setField("stock", e.target.value)} placeholder="0" />
              <div>
                <label className="block text-xs text-white/50 mb-1.5">Status</label>
                <select value={form.status} onChange={e => setField("status", e.target.value as Status)} className="w-full bg-[#0a0a0a] border border-white/[0.07] rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#ff6500]/50">
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>
            </div>
          </FormSection>

          <FormSection title="Sizes">
            <div className="flex flex-wrap gap-2 mb-3">
              {SIZE_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSize(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${form.sizes.includes(s) ? "bg-[#ff6500] border-[#ff6500] text-white" : "bg-transparent border-white/10 text-white/50 hover:border-white/30 hover:text-white"}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={customSize} onChange={e => setCustomSize(e.target.value)} placeholder="Custom size..." className="flex-1 bg-[#0a0a0a] border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none" />
              <button type="button" onClick={() => { if (customSize) { toggleSize(customSize); setCustomSize(""); } }} className="px-3 py-2 border border-white/10 hover:border-white/20 rounded-lg text-white/60 hover:text-white text-sm">
                Add
              </button>
            </div>
          </FormSection>

          <FormSection title="Colors">
            <div className="flex flex-wrap gap-2 mb-3">
              {form.colors.map((c) => (
                <span key={c} className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1 text-sm">
                  {c}
                  <button onClick={() => setField("colors", form.colors.filter(x => x !== c))} className="text-white/30 hover:text-red-400">
                    <FiX className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={colorInput} onChange={e => setColorInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addColor()} placeholder="e.g. Jet Black, Burnt Orange..." className="flex-1 bg-[#0a0a0a] border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none" />
              <button type="button" onClick={addColor} className="px-3 py-2 border border-white/10 hover:border-white/20 rounded-lg text-white/60 hover:text-white text-sm">Add</button>
            </div>
          </FormSection>

          <FormSection title="Product Details">
            <div className="space-y-3">
              <Input label="Material" value={form.material} onChange={e => setField("material", e.target.value)} placeholder="e.g. 100% Heavyweight Cotton" />
              <Input label="Fit" value={form.fit} onChange={e => setField("fit", e.target.value)} placeholder="e.g. Oversized / Regular" />
              <Textarea label="Care Instructions" value={form.careInstructions} onChange={e => setField("careInstructions", e.target.value)} placeholder="e.g. Machine wash cold, tumble dry low..." rows={2} />
            </div>
          </FormSection>

          <FormSection title="Tags">
            <div className="flex flex-wrap gap-2 mb-3">
              {form.tags.map((t) => (
                <span key={t} className="flex items-center gap-1.5 bg-[#ff6500]/10 border border-[#ff6500]/20 text-[#ff6500] rounded-full px-3 py-1 text-xs">
                  {t}
                  <button onClick={() => setField("tags", form.tags.filter(x => x !== t))} className="hover:text-red-400">
                    <FiX className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 mb-2">
              <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { addTag(tagInput); setTagInput(""); } }} placeholder="Add a tag..." className="flex-1 bg-[#0a0a0a] border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TAG_SUGGESTIONS.filter(t => !form.tags.includes(t)).map(t => (
                <button key={t} onClick={() => addTag(t)} className="text-xs px-2.5 py-1 border border-white/10 rounded-full text-white/40 hover:text-white hover:border-white/20 transition-colors">
                  + {t}
                </button>
              ))}
            </div>
          </FormSection>
        </div>

        {/* RIGHT - Images & Visibility */}
        <div className="space-y-5">
          <FormSection title="Product Images">
            <div
              className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center cursor-pointer hover:border-[#ff6500]/30 transition-colors"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            >
              <FiImage className="w-8 h-8 text-white/20 mx-auto mb-2" />
              <p className="text-sm text-white/40">Drag & drop or <span className="text-[#ff6500]">browse</span></p>
              <p className="text-xs text-white/25 mt-1">JPG, PNG, WEBP</p>
            </div>
            <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={e => handleFiles(e.target.files)} />

            {images.length > 0 && (
              <div className="space-y-2 mt-3">
                {images.map((img, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-lg p-2">
                    <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
                      <Image src={img.preview} alt="" width={40} height={40} className="object-cover w-full h-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/60 truncate">{img.file.name}</p>
                      {img.progress > 0 && !img.uploaded && (
                        <div className="h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                          <div className="h-full bg-[#ff6500] rounded-full transition-all" style={{ width: `${img.progress}%` }} />
                        </div>
                      )}
                      {img.uploaded && <p className="text-xs text-green-400 mt-0.5 flex items-center gap-1"><FiCheck className="w-3 h-3" /> Uploaded</p>}
                      {img.error && <p className="text-xs text-red-400 mt-0.5">{img.error}</p>}
                    </div>
                    <button
                      onClick={() => setThumbnailIndex(i)}
                      className={`p-1 rounded transition-colors ${thumbnailIndex === i ? "text-[#ff6500]" : "text-white/20 hover:text-white/50"}`}
                      title="Set as thumbnail"
                    >
                      <FiStar className="w-4 h-4" />
                    </button>
                    <button onClick={() => removeImage(i)} className="p-1 text-white/20 hover:text-red-400 transition-colors rounded">
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {images.length > 0 && (
                  <p className="text-xs text-white/30">⭐ = thumbnail image</p>
                )}
              </div>
            )}
          </FormSection>

          <FormSection title="Visibility">
            <div className="space-y-4">
              <Toggle label="Featured" desc="Show on homepage featured section" checked={form.featured} onChange={v => setField("featured", v)} />
              <Toggle label="New Arrival" desc="Show in New Arrivals" checked={form.newArrival} onChange={v => setField("newArrival", v)} />
              <Toggle label="Trending" desc="Show in Trending section" checked={form.trending} onChange={v => setField("trending", v)} />
              <Toggle label="Best Seller" desc="Show in Best Sellers" checked={form.bestSeller} onChange={v => setField("bestSeller", v)} />
              <Toggle label="Limited Drop" desc="Show as Limited Drop" checked={form.limitedDrop} onChange={v => setField("limitedDrop", v)} />
            </div>
          </FormSection>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => handleSubmit("active")}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-[#ff6500] hover:bg-[#ff6500]/90 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60"
            >
              {saving ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiCheck className="w-4 h-4" />}
              Publish Product
            </button>
            <button
              onClick={() => handleSubmit("draft")}
              disabled={saving}
              className="w-full border border-white/10 hover:border-white/20 text-white/70 hover:text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-60 text-sm"
            >
              Save as Draft
            </button>
            <button
              onClick={() => router.back()}
              className="w-full text-white/30 hover:text-white/50 text-sm py-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
