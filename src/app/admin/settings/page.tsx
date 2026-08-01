"use client";

import { FiSettings, FiGlobe, FiTruck, FiPercent } from "react-icons/fi";

export default function SettingsPage() {
  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-white/40 text-sm mt-0.5">General store settings</p>
      </div>

      {[
        { title: "Store Information", icon: FiGlobe, fields: ["Website Name", "Store Email", "Phone Number", "Address"] },
        { title: "Shipping", icon: FiTruck, fields: ["Free Shipping Threshold (₹)", "Default Shipping Rate (₹)"] },
        { title: "Tax", icon: FiPercent, fields: ["GST Percentage (%)"] },
      ].map(section => (
        <div key={section.title} className="bg-[#141414] border border-white/[0.07] rounded-xl p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">
            <section.icon className="w-4 h-4" /> {section.title}
          </h3>
          <div className="space-y-3">
            {section.fields.map(field => (
              <div key={field}>
                <label className="block text-xs text-white/50 mb-1.5">{field}</label>
                <input placeholder={`Enter ${field.toLowerCase()}...`}
                  className="w-full bg-[#0a0a0a] border border-white/[0.07] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#ff6500]/50" />
              </div>
            ))}
          </div>
        </div>
      ))}

      <button className="bg-[#ff6500] hover:bg-[#ff6500]/90 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors">
        Save Settings
      </button>
    </div>
  );
}
