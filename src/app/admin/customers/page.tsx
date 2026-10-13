"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { adminDb } from "@/firebase/config";
import { archiveCustomerAsAdmin, deleteCustomerAsAdmin } from "@/services/adminDeletionService";
import { FiLoader, FiUsers, FiSearch, FiTrash2, FiX, FiAlertTriangle } from "react-icons/fi";

interface Customer {
  id: string;
  name: string;
  email: string;
  role: string;
  accountStatus?: string;
  createdAt?: unknown;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [confirmationStep, setConfirmationStep] = useState<1 | 2>(1);
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    getDocs(query(collection(adminDb, "users"), where("role", "==", "customer")))
      .then(snap => setCustomers(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Customer))
          .filter(customer => customer.accountStatus !== "archived")
      ))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = search ? customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase())
  ) : customers;

  const closeDeleteDialog = () => {
    if (deleting || archiving) return;
    setSelectedCustomer(null);
    setConfirmationStep(1);
    setDeleteError(null);
  };

  const archiveCustomer = async () => {
    if (!selectedCustomer || deleting || archiving) return;
    setArchiving(true);
    setDeleteError(null);
    try {
      await archiveCustomerAsAdmin(selectedCustomer.id);
      setCustomers((current) => current.filter((customer) => customer.id !== selectedCustomer.id));
      setSelectedCustomer(null);
      setConfirmationStep(1);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Unable to archive customer.");
    } finally {
      setArchiving(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedCustomer || deleting) return;
    if (confirmationStep === 1) {
      setConfirmationStep(2);
      return;
    }

    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteCustomerAsAdmin(selectedCustomer.id);
      setCustomers((current) => current.filter((customer) => customer.id !== selectedCustomer.id));
      setSelectedCustomer(null);
      setConfirmationStep(1);
      setDeleteError(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Unable to delete customer.");
    } finally {
      setDeleting(false);
    }
  };

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
                <th className="text-right px-5 py-3 font-medium">Action</th>
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
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(c);
                        setConfirmationStep(1);
                        setDeleteError(null);
                      }}
                      disabled={deleting || archiving}
                      aria-label={`Delete customer ${c.name || c.email}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs font-bold text-red-400 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FiTrash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedCustomer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDeleteDialog();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-customer-title"
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141414] p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-red-500/15 p-2.5 text-red-400">
                  <FiAlertTriangle className="h-5 w-5" />
                </span>
                <h2 id="delete-customer-title" className="text-lg font-bold text-white">
                  {confirmationStep === 1 ? "Delete customer?" : "Confirm permanent deletion"}
                </h2>
              </div>
              <button type="button" onClick={closeDeleteDialog} disabled={deleting} aria-label="Close dialog" className="text-white/50 hover:text-white disabled:opacity-50">
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <p className="text-white">
                <span className="font-bold">{selectedCustomer.name || "Unnamed customer"}</span>
                <span className="block text-white/60">{selectedCustomer.email || "No email available"}</span>
              </p>
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">
                Permanent deletion is only allowed when there are no related orders or account records. If dependencies exist, archive this customer instead; Firebase Authentication and history are retained.
              </p>
              {confirmationStep === 2 && (
                <p className="text-xs font-bold text-red-300">This is the final confirmation. Delete this customer profile?</p>
              )}
              {deleteError && <p className="text-xs text-red-400">{deleteError}</p>}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={archiveCustomer} disabled={deleting || archiving} className="rounded-lg border border-amber-500/30 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/10 disabled:opacity-50">
                {archiving ? "Archiving..." : "Archive customer"}
              </button>
              <button type="button" onClick={closeDeleteDialog} disabled={deleting || archiving} className="rounded-lg border border-white/10 px-4 py-2 text-xs font-bold text-white/70 hover:bg-white/5 disabled:opacity-50">
                Cancel
              </button>
              <button type="button" onClick={confirmDelete} disabled={deleting} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60">
                {deleting && <FiLoader className="h-3.5 w-3.5 animate-spin" />}
                {confirmationStep === 1 ? "Continue" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
