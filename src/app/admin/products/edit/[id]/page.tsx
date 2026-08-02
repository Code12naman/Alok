"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { getProductById, updateProduct, FirestoreProduct } from "@/services/productService";
import { auth } from "@/firebase/config";
import { getCategories, FirestoreCategory } from "@/services/categoryService";
import { uploadFile } from "@/services/storageService";
import { FiLoader, FiCheck, FiAlertCircle, FiStar, FiTrash2, FiImage, FiX } from "react-icons/fi";
import Image from "next/image";

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "One Size"];

interface ImageItem {
  file?: File;
  preview: string;
  url?: string;
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
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [thumbnailIndex, setThumbnailIndex] = useState(0);
  const [colorInput, setColorInput] = useState("");
  const [tagInput, setTagInput] = useState("");

  const [form, setForm] = useState<Partial<FirestoreProduct>>({
    name: "", slug: "", sku: "", shortDescription: "", description: "",
    price: 0, compareAtPrice: undefined, stock: 0, category: "", subcategory: "",
    material: "", fit: "", sizes: [], colors: [], tags: [],
    status: "draft", featured: false, newArrival: false, trending: false, bestSeller: false, limitedDrop: false,
  });

  useEffect(() => {
    Promise.all([getProductById(id), getCategories()]).then(([product, cats]) => {
      if (product) {
        setForm(product);
        const imgs: ImageItem[] = (product.images || []).map((url) => ({ preview: url, url, progress: 100, uploaded: true }));
        setImages(imgs);
        const thumbIdx = product.thumbnail ? imgs.findIndex((img) => img.url === product.thumbnail) : 0;
        setThumbnailIndex(Math.max(0, thumbIdx));
      }
      setCategories(cats);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const setField = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newImages: ImageItem[] = Array.from(files).map((file) => ({
      file, preview: URL.createObjectURL(file), progress: 0, uploaded: false,
    }));
    setImages((prev) => [...prev, ...newImages]);
  };

  const removeImage = (i: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
    if (thumbnailIndex >= i && thumbnailIndex > 0) setThumbnailIndex((t) => t - 1);
  };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.category) {
      setToast({ type: "error", msg: "Name, price, and category are required." });
      return;
    }
    if (!auth.currentUser) {
      console.error("PRODUCT UPDATE ERROR: Firebase auth user is null");
      setToast({ type: "error", msg: "Authentication error: You are not signed in to Firebase." });
      return;
    }
    setSaving(true);
    try {
      const urls: string[] = [];
      for (let i = 0; i < images.length; i++) {
        if (images[i].uploaded && images[i].url) { urls.push(images[i].url!); continue; }
        if (!images[i].file) continue;
        const url = await uploadFile(images[i].file!, `products/${id}`, (pct) => {
          setImages((prev) => { const c = [...prev]; c[i] = { ...c[i], progress: pct }; return c; });
        });
        urls.push(url);
      }
      const thumbnail = urls[thumbnailIndex] || urls[0] || form.thumbnail || "";
      await updateProduct(id, { ...form, images: urls, thumbnail } as Partial<FirestoreProduct>);
      setToast({ type: "success", msg: "Product updated!" });
      setTimeout(() => router.push("/admin/products"), 1000);
    } catch (err: any) {
      console.error("PRODUCT UPDATE ERROR:", err?.code, err?.message, err);
      setToast({ type: "error", msg: err?.message || "Failed to update product." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <FiLoader className="w-8 h-8 text-[#ff6500] animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Edit Product</h1>
        <button onClick={() => router.back()} className="text-white/40 hover:text-white text-sm transition-colors">← Back</button>
      </div>

      {toast && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border text-sm ${toast.type === "success" ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
          {toast.type === "success" ? <FiCheck className="w-4 h-4" /> : <FiAlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Basic */}
          <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest">Basic Information</h3>
            {[
              { label: "Product Name *", key: "name", placeholder: "Product name" },
              { label: "Short Description", key: "shortDescription", placeholder: "Brief description" },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-xs text-white/50 mb-1.5">{label}</label>
                <input value={(form as any)[key] || ""} onChange={e => setField(key, e.target.value)} placeholder={placeholder}
                  className="w-full bg-[#0a0a0a] border border-white/[0.07] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#ff6500]/50" />
              </div>
            ))}
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Description</label>
              <textarea value={form.description || ""} onChange={e => setField("description", e.target.value)} rows={3}
                className="w-full bg-[#0a0a0a] border border-white/[0.07] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#ff6500]/50 resize-none" />
            </div>
          </div>

          {/* Pricing & Inventory */}
          <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-5">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">Pricing & Inventory</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Price (₹) *", key: "price", type: "number" },
                { label: "Compare At (₹)", key: "compareAtPrice", type: "number" },
                { label: "Stock *", key: "stock", type: "number" },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-xs text-white/50 mb-1.5">{label}</label>
                  <input type={type} value={(form as any)[key] ?? ""} onChange={e => setField(key, type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-white/[0.07] rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#ff6500]/50" />
                </div>
              ))}
            </div>
          </div>

          {/* Category & Status */}
          <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-5">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">Category & Status</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/50 mb-1.5">Category *</label>
                <select value={form.category || ""} onChange={e => setField("category", e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/[0.07] rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#ff6500]/50">
                  <option value="">Select...</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1.5">Status</label>
                <select value={form.status || "draft"} onChange={e => setField("status", e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/[0.07] rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#ff6500]/50">
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sizes */}
          <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-5">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">Sizes</h3>
            <div className="flex flex-wrap gap-2">
              {SIZE_OPTIONS.map(s => (
                <button key={s} type="button" onClick={() => {
                  const current = form.sizes || [];
                  setField("sizes", current.includes(s) ? current.filter(x => x !== s) : [...current, s]);
                }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${(form.sizes || []).includes(s) ? "bg-[#ff6500] border-[#ff6500] text-white" : "bg-transparent border-white/10 text-white/50 hover:text-white"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          {/* Images */}
          <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-5">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">Images</h3>
            <div className="border-2 border-dashed border-white/10 rounded-xl p-4 text-center cursor-pointer hover:border-[#ff6500]/30 transition-colors mb-3"
              onClick={() => fileRef.current?.click()}>
              <FiImage className="w-6 h-6 text-white/20 mx-auto mb-1" />
              <p className="text-xs text-white/40">Click to add more images</p>
            </div>
            <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={e => handleFiles(e.target.files)} />
            <div className="space-y-2">
              {images.map((img, i) => (
                <div key={i} className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-lg p-2">
                  <div className="w-9 h-9 rounded overflow-hidden flex-shrink-0">
                    <Image src={img.preview} alt="" width={36} height={36} className="object-cover w-full h-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {img.progress > 0 && !img.uploaded && (
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#ff6500]" style={{ width: `${img.progress}%` }} />
                      </div>
                    )}
                    {img.uploaded && <p className="text-xs text-green-400 flex items-center gap-1"><FiCheck className="w-3 h-3" /> Ready</p>}
                  </div>
                  <button onClick={() => setThumbnailIndex(i)} className={`p-1 rounded ${thumbnailIndex === i ? "text-[#ff6500]" : "text-white/20 hover:text-white/50"}`}>
                    <FiStar className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => removeImage(i)} className="p-1 text-white/20 hover:text-red-400">
                    <FiX className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Visibility Toggles */}
          <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest">Visibility</h3>
            {[
              { key: "featured", label: "Featured" },
              { key: "newArrival", label: "New Arrival" },
              { key: "trending", label: "Trending" },
              { key: "bestSeller", label: "Best Seller" },
              { key: "limitedDrop", label: "Limited Drop" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-white/70">{label}</span>
                <div onClick={() => setField(key, !(form as any)[key])}
                  className={`w-9 h-5 rounded-full transition-colors relative ${(form as any)[key] ? "bg-[#ff6500]" : "bg-white/10"}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${(form as any)[key] ? "left-4.5" : "left-0.5"}`} />
                </div>
              </label>
            ))}
          </div>

          <button onClick={handleSave} disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-[#ff6500] hover:bg-[#ff6500]/90 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60">
            {saving ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiCheck className="w-4 h-4" />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
