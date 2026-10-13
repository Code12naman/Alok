"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  getProducts,
  deleteProduct,
  getProductById,
  FirestoreProduct,
  getImageUrl,
  getImagePublicId,
} from "@/services/productService";
import { deleteCloudinaryAsset } from "@/services/cloudinaryService";
import { adminAuth, adminDb } from "@/firebase/config";
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiLoader, FiPackage, FiEye } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/15 text-green-400 border border-green-500/20",
  draft: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20",
  out_of_stock: "bg-red-500/15 text-red-400 border border-red-500/20",
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<FirestoreProduct[]>([]);
  const [filtered, setFiltered] = useState<FirestoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getProducts();
      setProducts(data);
      setFiltered(data);
    } catch (e) {
      setError("Failed to load products. Check Firestore rules.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let res = [...products];
    if (search)
      res = res.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.sku?.toLowerCase().includes(search.toLowerCase())
      );
    if (statusFilter !== "all") res = res.filter((p) => p.status === statusFilter);
    setFiltered(res);
  }, [search, statusFilter, products]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      // 1. Fetch product to locate Cloudinary publicIds
      const product = await getProductById(deleteId);
      if (product && product.images) {
        const publicIds = product.images
          .map((img) => getImagePublicId(img))
          .filter(Boolean) as string[];

        if (publicIds.length > 0) {
          const user = adminAuth.currentUser;
          const idToken = user ? await user.getIdToken().catch(() => "") : "";
          if (idToken) {
            console.log(
              `[AdminProducts] Deleting ${publicIds.length} Cloudinary assets for product "${deleteId}"...`
            );
            await Promise.allSettled(
              publicIds.map((pid) => deleteCloudinaryAsset(pid, idToken))
            );
          }
        }
      }

      // 2. Delete Firestore product document
      await deleteProduct(deleteId, adminDb);
      setProducts((prev) => prev.filter((p) => p.id !== deleteId));
    } catch (err) {
      console.error("Failed to delete product:", err);
      alert("Failed to delete product.");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Products</h1>
          <p className="text-white/40 text-sm mt-0.5">{products.length} total products</p>
        </div>
        <Link href="/admin/products/add" className="inline-flex items-center gap-2 bg-[#ff6500] hover:bg-[#ff6500]/90 text-white px-4 py-2.5 rounded-lg transition-colors font-semibold text-sm">
          <FiPlus className="w-4 h-4" /> Add Product
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full bg-[#141414] border border-white/[0.07] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#ff6500]/40"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#141414] border border-white/[0.07] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#ff6500]/40"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
        <button onClick={load} className="border border-white/10 hover:border-white/20 rounded-lg px-4 py-2.5 text-sm text-white/60 hover:text-white transition-colors">
          Refresh
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <FiLoader className="w-8 h-8 text-[#ff6500] animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
          <p className="text-red-400">{error}</p>
          <button onClick={load} className="mt-3 text-sm text-[#ff6500] hover:underline">Try again</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-16 text-center">
          <FiPackage className="w-10 h-10 text-white/20 mx-auto mb-4" />
          <p className="text-white/60 mb-1">{search || statusFilter !== "all" ? "No products match your filters." : "No products yet."}</p>
          {!search && statusFilter === "all" && (
            <Link href="/admin/products/add" className="mt-4 inline-flex items-center gap-2 text-[#ff6500] hover:underline text-sm">
              <FiPlus className="w-4 h-4" /> Add your first product
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-[#141414] border border-white/[0.07] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] text-white/40 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3 font-medium">Product</th>
                  <th className="text-left px-5 py-3 font-medium hidden md:table-cell">SKU</th>
                  <th className="text-left px-5 py-3 font-medium hidden sm:table-cell">Category</th>
                  <th className="text-left px-5 py-3 font-medium">Price</th>
                  <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Stock</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-right px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((p, i) => (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-md overflow-hidden bg-white/5 flex-shrink-0">
                            {getImageUrl(p.thumbnail) || getImageUrl(p.images?.[0]) ? (
                              <Image src={getImageUrl(p.thumbnail) || getImageUrl(p.images?.[0])} alt={p.name} width={40} height={40} className="object-cover w-full h-full" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white/20">
                                <FiPackage className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                          <span className="font-medium text-white line-clamp-1">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-white/40 hidden md:table-cell">{p.sku || "—"}</td>
                      <td className="px-5 py-3 text-white/60 hidden sm:table-cell">{p.category || "—"}</td>
                      <td className="px-5 py-3 font-semibold text-white">
                        ₹{p.price}
                        {p.compareAtPrice && <span className="text-white/30 line-through text-xs ml-1">₹{p.compareAtPrice}</span>}
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <span className={p.stock <= 5 ? "text-red-400 font-semibold" : "text-white/60"}>{p.stock}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[p.status] || STATUS_COLORS.draft}`}>
                          {p.status === "out_of_stock" ? "Out of Stock" : p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/products/edit/${p.id}`} className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/5 transition-colors">
                            <FiEdit2 className="w-4 h-4" />
                          </Link>
                          <button onClick={() => setDeleteId(p.id!)} className="p-1.5 rounded-md text-white/40 hover:text-red-400 hover:bg-red-400/5 transition-colors">
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-[#141414] border border-white/10 rounded-2xl p-6 max-w-sm w-full">
              <h3 className="font-bold mb-2">Delete Product?</h3>
              <p className="text-white/50 text-sm mb-6">This action cannot be undone. The product will be permanently removed from Firestore.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 border border-white/10 rounded-lg py-2.5 text-sm text-white/60 hover:text-white hover:border-white/20 transition-colors">
                  Cancel
                </button>
                <button onClick={handleDelete} disabled={deleting} className="flex-1 bg-red-600 hover:bg-red-700 rounded-lg py-2.5 text-sm text-white font-semibold transition-colors disabled:opacity-70">
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
