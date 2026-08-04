"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  AdminReview,
  getAllReviewsForAdmin,
  toggleHideReview,
  deleteReview,
  formatOrderTimestamp,
} from "@/services/reviewService";
import { SafeImage } from "@/components/ui/SafeImage";
import {
  FiStar,
  FiSearch,
  FiLoader,
  FiCheckCircle,
  FiEyeOff,
  FiEye,
  FiTrash2,
  FiShoppingBag,
  FiExternalLink,
  FiMessageSquare,
} from "react-icons/fi";

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "hidden">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getAllReviewsForAdmin();
      setReviews(data);
    } catch (err) {
      console.error("[AdminReviews] Error loading reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleHide = async (rev: AdminReview) => {
    if (!rev.id) return;
    setUpdatingId(rev.id);
    try {
      await toggleHideReview(rev.productId, rev.id, Boolean(rev.hidden));
      setReviews((prev) =>
        prev.map((r) => (r.id === rev.id ? { ...r, hidden: !r.hidden } : r))
      );
    } catch (err) {
      console.error("[AdminReviews] Error toggling hide state:", err);
      alert("Failed to update review visibility status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (rev: AdminReview) => {
    if (!rev.id) return;
    if (!confirm(`Are you sure you want to permanently delete the review by "${rev.userName}"?`)) return;

    setUpdatingId(rev.id);
    try {
      await deleteReview(rev.productId, rev.id);
      setReviews((prev) => prev.filter((r) => r.id !== rev.id));
    } catch (err) {
      console.error("[AdminReviews] Error deleting review:", err);
      alert("Failed to delete review.");
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = reviews.filter((rev) => {
    if (statusFilter === "active" && rev.hidden) return false;
    if (statusFilter === "hidden" && !rev.hidden) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();

    return (
      rev.userName.toLowerCase().includes(q) ||
      (rev.productName && rev.productName.toLowerCase().includes(q)) ||
      rev.review.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141414] border border-white/[0.07] p-5 rounded-2xl">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-white flex items-center gap-2">
            <FiStar className="w-6 h-6 text-[#ff6500]" /> Product Reviews Moderation
          </h1>
          <p className="text-xs text-white/50 font-medium mt-1">
            Manage customer feedback, ratings, and image attachments ({reviews.length} total)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 sm:w-64">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product, customer, or review..."
              className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#ff6500]"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-[#0a0a0a] border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[#ff6500] cursor-pointer"
          >
            <option value="all">All Reviews ({reviews.length})</option>
            <option value="active">Active Only</option>
            <option value="hidden">Hidden Only</option>
          </select>
        </div>
      </div>

      {/* Reviews Table */}
      {loading ? (
        <div className="bg-[#141414] border border-white/[0.07] rounded-2xl p-16 flex items-center justify-center">
          <FiLoader className="w-8 h-8 text-[#ff6500] animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#141414] border border-white/[0.07] rounded-2xl p-16 text-center">
          <FiMessageSquare className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/60 font-bold text-sm">No reviews found.</p>
          <p className="text-white/40 text-xs mt-1">
            {searchQuery
              ? `No reviews matching "${searchQuery}"`
              : "Customer product reviews will appear here."}
          </p>
        </div>
      ) : (
        <div className="bg-[#141414] border border-white/[0.07] rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.07] bg-white/[0.02] text-white/40 font-bold uppercase tracking-wider">
                  <th className="px-5 py-3.5">Product</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Rating</th>
                  <th className="px-5 py-3.5">Review</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((rev) => (
                  <tr key={rev.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Product */}
                    <td className="px-5 py-4 max-w-[180px]">
                      <Link
                        href={`/product/${rev.productSlug}`}
                        target="_blank"
                        className="font-bold text-white hover:text-[#ff6500] transition-colors flex items-center gap-1 group line-clamp-2"
                      >
                        <span>{rev.productName || "Product"}</span>
                        <FiExternalLink className="w-3 h-3 text-white/40 group-hover:text-[#ff6500] flex-shrink-0" />
                      </Link>
                      <span className="text-[10px] font-mono text-white/40">
                        ID: {rev.productId}
                      </span>
                    </td>

                    {/* Customer */}
                    <td className="px-5 py-4">
                      <p className="font-bold text-white text-xs">{rev.userName}</p>
                      {rev.verifiedPurchase && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold mt-0.5">
                          <FiCheckCircle className="w-3 h-3" /> Verified Buyer
                        </span>
                      )}
                    </td>

                    {/* Rating */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 text-amber-400 font-bold">
                        <span className="text-sm">{rev.rating}</span>
                        <FiStar className="w-3.5 h-3.5 fill-amber-400" />
                      </div>
                    </td>

                    {/* Review text & attachments */}
                    <td className="px-5 py-4 max-w-xs">
                      <p className="text-white/80 line-clamp-3 leading-relaxed">
                        {rev.review}
                      </p>
                      {rev.images && rev.images.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2">
                          {rev.images.map((img, idx) => (
                            <a
                              key={idx}
                              href={img}
                              target="_blank"
                              rel="noreferrer"
                              className="relative h-8 w-8 rounded-lg overflow-hidden border border-white/10 block hover:opacity-80 transition-opacity"
                            >
                              <SafeImage src={img} alt="Attachment" fill sizes="32px" className="object-cover" />
                            </a>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4 text-white/50 text-[11px]">
                      {formatOrderTimestamp(rev.createdAt)}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      {rev.hidden ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                          <FiEyeOff className="w-3 h-3" /> Hidden
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                          <FiEye className="w-3 h-3" /> Active
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleHide(rev)}
                          disabled={updatingId === rev.id}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                            rev.hidden
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                          }`}
                        >
                          {rev.hidden ? "Restore" : "Hide"}
                        </button>
                        <button
                          onClick={() => handleDelete(rev)}
                          disabled={updatingId === rev.id}
                          className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                          title="Delete Review"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
