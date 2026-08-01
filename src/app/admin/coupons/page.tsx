"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, deleteDoc, doc, getDocs, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase/config";
import { FiPlus, FiTrash2, FiLoader, FiTag, FiCheck, FiX } from "react-icons/fi";

interface Coupon {
  id?: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  minimumOrder?: number;
  maximumDiscount?: number;
  usageLimit?: number;
  active: boolean;
  expiresAt?: string;
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Omit<Coupon, "id">>({ code: "", type: "percentage", value: 0, active: true });

  const load = async () => {
    setLoading(true);
    try { const snap = await getDocs(collection(db, "coupons")); setCoupons(snap.docs.map(d => ({ id: d.id, ...d.data() } as Coupon))); }
    catch { }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.code.trim() || !form.value) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "coupons"), { ...form, code: form.code.toUpperCase().trim(), createdAt: serverTimestamp() });
      setForm({ code: "", type: "percentage", value: 0, active: true });
      setShowForm(false);
      load();
    } catch { alert("Failed to save coupon."); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this coupon?")) return;
    try { await deleteDoc(doc(db, "coupons", id)); setCoupons(prev => prev.filter(c => c.id !== id)); }
    catch { alert("Failed to delete."); }
  };

  const toggleActive = async (coupon: Coupon) => {
    try {
      await updateDoc(doc(db, "coupons", coupon.id!), { active: !coupon.active });
      setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, active: !c.active } : c));
    } catch { }
  };

  const setField = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Coupons</h1>
          <p className="text-white/40 text-sm mt-0.5">{coupons.length} coupons</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-[#ff6500] hover:bg-[#ff6500]/90 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors">
          <FiPlus className="w-4 h-4" /> Add Coupon
        </button>
      </div>

      {showForm && (
        <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-5">
          <h3 className="font-semibold mb-4">New Coupon</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
            {[
              { label: "Coupon Code *", key: "code", type: "text", placeholder: "e.g. SAVE20" },
              { label: "Value *", key: "value", type: "number", placeholder: "20" },
              { label: "Min Order (₹)", key: "minimumOrder", type: "number", placeholder: "0" },
              { label: "Expiry Date", key: "expiresAt", type: "date", placeholder: "" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-white/50 block mb-1.5">{f.label}</label>
                <input type={f.type} value={(form as any)[f.key] || ""} onChange={e => setField(f.key, f.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full bg-[#0a0a0a] border border-white/[0.07] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#ff6500]/50" />
              </div>
            ))}
            <div>
              <label className="text-xs text-white/50 block mb-1.5">Type</label>
              <select value={form.type} onChange={e => setField("type", e.target.value)}
                className="w-full bg-[#0a0a0a] border border-white/[0.07] rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#ff6500]/50">
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={saving || !form.code || !form.value}
              className="flex items-center gap-2 bg-[#ff6500] hover:bg-[#ff6500]/90 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60 transition-colors">
              {saving ? <FiLoader className="w-3.5 h-3.5 animate-spin" /> : <FiCheck className="w-3.5 h-3.5" />}
              {saving ? "Saving..." : "Save Coupon"}
            </button>
            <button onClick={() => setShowForm(false)} className="flex items-center gap-1.5 text-white/40 hover:text-white px-3 py-2 rounded-lg text-sm border border-white/10 hover:border-white/20 transition-colors">
              <FiX className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40"><FiLoader className="w-7 h-7 text-[#ff6500] animate-spin" /></div>
      ) : coupons.length === 0 ? (
        <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-16 text-center">
          <FiTag className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/50">No coupons yet.</p>
        </div>
      ) : (
        <div className="bg-[#141414] border border-white/[0.07] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07] text-white/40 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">Code</th>
                <th className="text-left px-5 py-3 font-medium">Type</th>
                <th className="text-left px-5 py-3 font-medium">Value</th>
                <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Min Order</th>
                <th className="text-left px-5 py-3 font-medium">Active</th>
                <th className="text-right px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map(c => (
                <tr key={c.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 font-mono font-semibold text-[#ff6500]">{c.code}</td>
                  <td className="px-5 py-3 text-white/60">{c.type === "percentage" ? "%" : "₹"} off</td>
                  <td className="px-5 py-3 font-semibold">{c.type === "percentage" ? `${c.value}%` : `₹${c.value}`}</td>
                  <td className="px-5 py-3 text-white/60 hidden md:table-cell">{c.minimumOrder ? `₹${c.minimumOrder}` : "—"}</td>
                  <td className="px-5 py-3">
                    <button onClick={() => toggleActive(c)}
                      className={`w-8 h-4.5 rounded-full transition-colors relative ${c.active ? "bg-[#ff6500]" : "bg-white/10"}`}>
                      <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all ${c.active ? "left-4" : "left-0.5"}`} />
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => handleDelete(c.id!)} className="p-1.5 text-white/30 hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-colors">
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
