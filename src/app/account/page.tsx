"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  User,
  ShoppingBag,
  MapPin,
  Heart,
  Key,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Phone,
  Mail,
  Plus,
  Trash2,
  Edit2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { logoutUser, sendPasswordResetLink, updateCustomerProfile } from "@/services/authService";
import {
  Address,
  getCustomerAddresses,
  deleteCustomerAddress,
  addCustomerAddress,
  updateCustomerAddress,
} from "@/services/addressService";

export default function AccountPage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"profile" | "addresses" | "password">("profile");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [resetMsg, setResetMsg] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState(() => {
    const nameParts = (profile?.name || "").trim().split(/\s+/);
    return {
      firstName: profile?.firstName || nameParts[0] || "",
      lastName: profile?.lastName || nameParts.slice(1).join(" ") || "",
      phone: profile?.phone || "",
      dateOfBirth: profile?.dateOfBirth || "",
    };
  });
  const [profileMessage, setProfileMessage] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  const [newAddr, setNewAddr] = useState({
    fullName: "",
    phone: "",
    building: "",
    street: "",
    city: "",
    state: "",
    pinCode: "",
    landmark: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/account");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      getCustomerAddresses(user.uid).then(setAddresses);
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await logoutUser();
      router.push("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handleSendResetPassword = async () => {
    if (user?.email) {
      try {
        await sendPasswordResetLink(user.email);
        setResetMsg(`Password reset link sent to ${user.email}`);
      } catch (err: unknown) {
        setResetMsg(err instanceof Error ? err.message : "Failed to send reset link.");
      }
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProfileSaving(true);
    setProfileMessage("");
    try {
      await updateCustomerProfile(user.uid, profileForm);
      await refreshProfile();
      setProfileMessage("Profile updated successfully.");
    } catch (err: unknown) {
      setProfileMessage(err instanceof Error ? err.message : "Could not update your profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      if (editingAddressId) {
        await updateCustomerAddress(user.uid, editingAddressId, newAddr);
      } else {
        await addCustomerAddress(user.uid, newAddr);
      }
      const list = await getCustomerAddresses(user.uid);
      setAddresses(list);
      setShowAddModal(false);
      setEditingAddressId(null);
      setNewAddr({ fullName: "", phone: "", building: "", street: "", city: "", state: "", pinCode: "", landmark: "" });
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditAddress = (address: Address) => {
    if (!address.id) return;
    setEditingAddressId(address.id);
    setNewAddr({
      fullName: address.fullName || "",
      phone: address.phone || "",
      building: address.building || address.addressLine1 || "",
      street: address.street || address.addressLine2 || "",
      city: address.city || "",
      state: address.state || "",
      pinCode: address.pinCode || address.postalCode || "",
      landmark: address.landmark || "",
    });
    setShowAddModal(true);
  };

  const handleDeleteAddress = async (id: string) => {
    if (!user) return;
    try {
      await deleteCustomerAddress(user.uid, id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-[#F4512C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5] py-10 md:py-16">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        
        {/* Header */}
        <div className="bg-white border border-[#E6E6E3] rounded-3xl p-6 md:p-8 mb-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-[#FFF3F0] text-[#F4512C] rounded-2xl flex items-center justify-center font-extrabold text-2xl border border-[#F4512C]/20">
              {profile?.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-xl md:text-2xl text-[#111111]">{profile?.name || "Customer Account"}</h1>
                <span className="bg-[#111111] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  {profile?.customerId || "—"}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-1">{user.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Navigation Sidebar (4 cols) */}
          <div className="lg:col-span-4 bg-white border border-[#E6E6E3] rounded-3xl p-4 shadow-xs space-y-1">
            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "profile" ? "bg-[#F4512C] text-white" : "text-gray-700 hover:bg-[#F7F7F5]"
              }`}
            >
              <span className="flex items-center gap-3">
                <User className="h-4 w-4" /> My Profile
              </span>
              <ChevronRight className="h-4 w-4" />
            </button>

            <Link
              href="/account/orders"
              className="w-full flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold text-gray-700 hover:bg-[#F7F7F5] transition-all"
            >
              <span className="flex items-center gap-3">
                <ShoppingBag className="h-4 w-4" /> My Orders
              </span>
              <ChevronRight className="h-4 w-4" />
            </Link>

            <button
              onClick={() => setActiveTab("addresses")}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "addresses" ? "bg-[#F4512C] text-white" : "text-gray-700 hover:bg-[#F7F7F5]"
              }`}
            >
              <span className="flex items-center gap-3">
                <MapPin className="h-4 w-4" /> Saved Addresses ({addresses.length})
              </span>
              <ChevronRight className="h-4 w-4" />
            </button>

            <Link
              href="/wishlist"
              className="w-full flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold text-gray-700 hover:bg-[#F7F7F5] transition-all"
            >
              <span className="flex items-center gap-3">
                <Heart className="h-4 w-4" /> Wishlist
              </span>
              <ChevronRight className="h-4 w-4" />
            </Link>

            <button
              onClick={() => setActiveTab("password")}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "password" ? "bg-[#F4512C] text-white" : "text-gray-700 hover:bg-[#F7F7F5]"
              }`}
            >
              <span className="flex items-center gap-3">
                <Key className="h-4 w-4" /> Change Password
              </span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Main Content Area (8 cols) */}
          <div className="lg:col-span-8 bg-white border border-[#E6E6E3] rounded-3xl p-6 md:p-8 shadow-xs">
            
            {/* PROFILE TAB */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <h2 className="font-extrabold text-lg text-[#111111]">Profile Details</h2>

                <form onSubmit={handleProfileSave} className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl border border-[#E6E6E3] bg-[#F7F7F5] p-4">
                  <input
                    required
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                    placeholder="First name *"
                    className="rounded-xl border border-[#E6E6E3] bg-white px-3 py-2.5 text-xs"
                  />
                  <input
                    required
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                    placeholder="Last name *"
                    className="rounded-xl border border-[#E6E6E3] bg-white px-3 py-2.5 text-xs"
                  />
                  <input
                    required
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    placeholder="Phone number *"
                    className="rounded-xl border border-[#E6E6E3] bg-white px-3 py-2.5 text-xs"
                  />
                  <input
                    type="date"
                    value={profileForm.dateOfBirth}
                    onChange={(e) => setProfileForm({ ...profileForm, dateOfBirth: e.target.value })}
                    className="rounded-xl border border-[#E6E6E3] bg-white px-3 py-2.5 text-xs"
                  />
                  <div className="md:col-span-2 flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-gray-500">{profileMessage}</span>
                    <button
                      type="submit"
                      disabled={profileSaving}
                      className="rounded-xl bg-[#F4512C] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-60"
                    >
                      {profileSaving ? "Saving..." : "Save Profile"}
                    </button>
                  </div>
                </form>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#F7F7F5] border border-[#E6E6E3] p-4 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Customer ID</span>
                    <span className="font-extrabold text-sm text-[#F4512C]">{profile?.customerId || "—"}</span>
                  </div>

                  <div className="bg-[#F7F7F5] border border-[#E6E6E3] p-4 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Full Name</span>
                    <span className="font-bold text-sm text-[#111111]">{profile?.name || "N/A"}</span>
                  </div>

                  <div className="bg-[#F7F7F5] border border-[#E6E6E3] p-4 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Email Address</span>
                    <span className="font-bold text-sm text-[#111111]">{user.email}</span>
                  </div>

                  <div className="bg-[#F7F7F5] border border-[#E6E6E3] p-4 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Phone Number</span>
                    <span className="font-bold text-sm text-[#111111]">{profile?.phone || "Not provided"}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E6E6E3] flex flex-wrap gap-4">
                  <Link
                    href="/account/orders"
                    className="inline-flex items-center gap-2 bg-[#F4512C] text-white text-xs font-bold px-6 py-3 rounded-xl hover:bg-[#DD3F1E] transition-colors"
                  >
                    View My Orders <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )}

            {/* SAVED ADDRESSES TAB */}
            {activeTab === "addresses" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-extrabold text-lg text-[#111111]">Saved Addresses</h2>
                  <button
                    onClick={() => setShowAddModal(!showAddModal)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F4512C] hover:underline cursor-pointer"
                  >
                    <Plus className="h-4 w-4" /> Add Address
                  </button>
                </div>

                {showAddModal && (
                  <form onSubmit={handleAddAddress} className="bg-[#F7F7F5] border border-[#E6E6E3] p-5 rounded-2xl space-y-3">
                    <h3 className="font-bold text-xs text-[#111111]">
                      {editingAddressId ? "Edit Address" : "New Address Details"}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <input
                        type="text"
                        placeholder="Full Name *"
                        required
                        value={newAddr.fullName}
                        onChange={(e) => setNewAddr({ ...newAddr, fullName: e.target.value })}
                        className="bg-white border border-[#E6E6E3] rounded-xl px-3 py-2"
                      />
                      <input
                        type="tel"
                        placeholder="Phone Number *"
                        required
                        value={newAddr.phone}
                        onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })}
                        className="bg-white border border-[#E6E6E3] rounded-xl px-3 py-2"
                      />
                      <input
                        type="text"
                        placeholder="Flat / Building *"
                        required
                        value={newAddr.building}
                        onChange={(e) => setNewAddr({ ...newAddr, building: e.target.value })}
                        className="bg-white border border-[#E6E6E3] rounded-xl px-3 py-2 md:col-span-2"
                      />
                      <input
                        type="text"
                        placeholder="Street / Area *"
                        required
                        value={newAddr.street}
                        onChange={(e) => setNewAddr({ ...newAddr, street: e.target.value })}
                        className="bg-white border border-[#E6E6E3] rounded-xl px-3 py-2 md:col-span-2"
                      />
                      <input
                        type="text"
                        placeholder="City *"
                        required
                        value={newAddr.city}
                        onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                        className="bg-white border border-[#E6E6E3] rounded-xl px-3 py-2"
                      />
                      <input
                        type="text"
                        placeholder="State *"
                        required
                        value={newAddr.state}
                        onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })}
                        className="bg-white border border-[#E6E6E3] rounded-xl px-3 py-2"
                      />
                      <input
                        type="text"
                        placeholder="PIN Code *"
                        required
                        value={newAddr.pinCode}
                        onChange={(e) => setNewAddr({ ...newAddr, pinCode: e.target.value })}
                        className="bg-white border border-[#E6E6E3] rounded-xl px-3 py-2"
                      />
                      <input
                        type="text"
                        placeholder="Landmark (Optional)"
                        value={newAddr.landmark}
                        onChange={(e) => setNewAddr({ ...newAddr, landmark: e.target.value })}
                        className="bg-white border border-[#E6E6E3] rounded-xl px-3 py-2"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button type="submit" className="bg-[#F4512C] text-white text-xs font-bold px-5 py-2.5 rounded-xl">
                        {editingAddressId ? "Update Address" : "Save Address"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddModal(false);
                          setEditingAddressId(null);
                        }}
                        className="text-xs font-bold text-gray-500 py-2.5 px-3"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {addresses.length === 0 ? (
                  <p className="text-xs text-gray-500">No saved addresses yet.</p>
                ) : (
                  <div className="space-y-3">
                    {addresses.map((addr) => (
                      <div key={addr.id} className="bg-[#F7F7F5] border border-[#E6E6E3] p-4 rounded-2xl flex justify-between items-start text-xs">
                        <div>
                          <p className="font-bold text-[#111111]">{addr.fullName} <span className="text-gray-400 font-normal">({addr.phone})</span></p>
                          <p className="text-gray-600 mt-1">{addr.building}, {addr.street}</p>
                          <p className="text-gray-600">{addr.city}, {addr.state} - {addr.pinCode}</p>
                        </div>
                        {addr.id && (
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleEditAddress(addr)} className="text-gray-400 hover:text-[#F4512C] p-1">
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDeleteAddress(addr.id!)} className="text-gray-400 hover:text-red-500 p-1">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PASSWORD TAB */}
            {activeTab === "password" && (
              <div className="space-y-6">
                <h2 className="font-extrabold text-lg text-[#111111]">Change Password</h2>
                <p className="text-xs text-gray-500">
                  Request a secure password reset link sent directly to your registered email address.
                </p>

                {resetMsg && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs p-3 rounded-xl font-medium">
                    {resetMsg}
                  </div>
                )}

                <button
                  onClick={handleSendResetPassword}
                  className="bg-[#F4512C] hover:bg-[#DD3F1E] text-white text-xs font-bold px-6 py-3 rounded-xl transition-colors cursor-pointer"
                >
                  Send Password Reset Link
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
