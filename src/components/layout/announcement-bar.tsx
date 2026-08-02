"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Truck, Flame, Zap } from "lucide-react";

const announcements = [
  { icon: Truck, text: "Free Worldwide Shipping Over ₹999" },
  { icon: Flame, text: "Summer Sale Up To 70% Off" },
  { icon: Zap, text: "Limited Time Flash Deals" },
];

export function AnnouncementBar() {
  const pathname = usePathname();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % announcements.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  if (pathname?.startsWith("/admin")) return null;

  const CurrentIcon = announcements[index].icon;

  return (
    <aside
      className="bg-black text-white text-[11px] font-medium tracking-wide h-8 flex items-center justify-center px-4 relative z-50 overflow-hidden select-none"
      aria-label="Announcement bar"
    >
      {/* Desktop view */}
      <div className="hidden md:flex items-center justify-center gap-6">
        {announcements.map((item, i) => {
          const IconComponent = item.icon;
          return (
            <div key={i} className="flex items-center gap-2">
              <IconComponent className="h-3.5 w-3.5 text-[#F4512C]" />
              <span>{item.text}</span>
              {i < announcements.length - 1 && (
                <span className="text-white/30 ml-4">|</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile view (auto-sliding single message) */}
      <div className="flex md:hidden items-center justify-center gap-2 transition-all duration-500">
        <CurrentIcon className="h-3.5 w-3.5 text-[#F4512C] animate-pulse" />
        <span>{announcements[index].text}</span>
      </div>
    </aside>
  );
}
