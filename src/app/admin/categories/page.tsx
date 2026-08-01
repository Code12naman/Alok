"use client";

import { useState, useEffect } from "react";
import { getCategories, addCategory, deleteCategory, updateCategory, FirestoreCategory } from "@/services/categoryService";
import { uploadFile } from "@/services/storageService";
import { FiPlus, FiTrash2, FiEdit2, FiLoader, FiCheck, FiX, FiTag } from "react-icons/fi";
import Image from "next/image";

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
    try { setCategories(await getCategories()); } catch { }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => { setName(""); setDescription(""); setImageFile(null); setEditId(null); setShowForm(false); };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      let imageUrl = editId ? categories.find(c => c.id === editId)?.image : undefined;
      if (imageFile) imageUrl = await uploadFile(imageFile, "categories");
      if (editId) {
        await updateCategory(editId, { name, description, image: imageUrl, active: true });
        setToast("Category updated!");
      } else {
        await addCategory({ name, description, image: imageUrl, active: true, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") });
        setToast("Category added!");
      }
      resetForm();
      load();
      setTimeout(() => setToast(""), 3000);
    } catch { setToast("Failed. Check Firestore rules."); }
    setSaving(false);
  };

  const startEdit = (cat: FirestoreCategory) => {
    setEditId(cat.id!);
    setName(cat.name);
    setDescription(cat.description || "");
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteCategory(deleteId); setCategories(prev => prev.filter(c => c.id !== deleteId)); }
    catch { alert("Failed to delete."); }
    setDeleteId(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Categories</h1>
          <p className="text-white/40 text-sm mt-0.5">{categories.length} categories</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-[#ff6500] hover:bg-[#ff6500]/90 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors">
          <FiPlus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {toast && <div className="bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl p-3 text-sm">{toast}</div>}

      {showForm && (
        <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-5">
          <h3 className="font-semibold mb-4">{editId ? "Edit Category" : "Add New Category"}</h3>
          <div className="space-y-3 max-w-md">
            <div>
              <label className="text-xs text-white/50 block mb-1.5">Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Category name"
                className="w-full bg-[#0a0a0a] border border-white/[0.07] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#ff6500]/50" />
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1.5">Description</label>
              <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description"
                className="w-full bg-[#0a0a0a] border border-white/[0.07] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#ff6500]/50" />
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1.5">Banner Image</label>
              <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)}
                className="text-sm text-white/60 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-white/10 file:text-white file:text-xs" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleSave} disabled={saving || !name}
                className="flex items-center gap-2 bg-[#ff6500] hover:bg-[#ff6500]/90 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60 transition-colors">
                {saving ? <FiLoader className="w-3.5 h-3.5 animate-spin" /> : <FiCheck className="w-3.5 h-3.5" />}
                {saving ? "Saving..." : editId ? "Update" : "Save"}
              </button>
              <button onClick={resetForm} className="flex items-center gap-1.5 text-white/40 hover:text-white px-3 py-2 rounded-lg text-sm border border-white/10 hover:border-white/20 transition-colors">
                <FiX className="w-3.5 h-3.5" /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40"><FiLoader className="w-7 h-7 text-[#ff6500] animate-spin" /></div>
      ) : categories.length === 0 ? (
        <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-16 text-center">
          <FiTag className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/50 mb-3">No categories yet.</p>
          <button onClick={() => setShowForm(true)} className="text-[#ff6500] text-sm hover:underline">Add your first category →</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {categories.map(cat => (
            <div key={cat.id} className="bg-[#141414] border border-white/[0.07] rounded-xl overflow-hidden">
              {cat.image && (
                <div className="relative h-28">
                  <Image src={cat.image} alt={cat.name} fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
              )}
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{cat.name}</p>
                  {cat.description && <p className="text-white/40 text-xs mt-0.5 line-clamp-1">{cat.description}</p>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => startEdit(cat)} className="p-1.5 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                    <FiEdit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteId(cat.id!)} className="p-1.5 text-white/40 hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-colors">
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold mb-2">Delete Category?</h3>
            <p className="text-white/50 text-sm mb-5">This will only delete the category record, not the products.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 border border-white/10 rounded-lg py-2.5 text-sm text-white/60 hover:text-white transition-colors">Cancel</button>
              <button onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-700 rounded-lg py-2.5 text-sm text-white font-semibold transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
