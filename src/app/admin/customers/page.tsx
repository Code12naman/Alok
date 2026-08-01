"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/firebase/config";
import { FiLoader, FiUsers, FiSearch } from "react-icons/fi";

interface Customer { id: string; name: string; email: string; role: string; createdAt?: any; }

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getDocs(query(collection(db, "users"), where("role", "==", "customer")))
      .then(snap => setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Customer))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = search ? customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase())
  ) : customers;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Customers</h1>
          <p className="text-white/40 text-sm mt-0.5">{customers.length} registered customers</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..."
          className="w-full bg-[#141414] border border-white/[0.07] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#ff6500]/40" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><FiLoader className="w-7 h-7 text-[#ff6500] animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-16 text-center">
          <FiUsers className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/50">{search ? "No customers match your search." : "No customers yet."}</p>
        </div>
      ) : (
        <div className="bg-[#141414] border border-white/[0.07] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07] text-white/40 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">Name</th>
                <th className="text-left px-5 py-3 font-medium">Email</th>
                <th className="text-left px-5 py-3 font-medium hidden md:table-cell">User ID</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {c.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <span className="font-medium">{c.name || "—"}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-white/60">{c.email || "—"}</td>
                  <td className="px-5 py-3 text-white/30 font-mono text-xs hidden md:table-cell">{c.id.slice(0, 16)}...</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
