import { Truck, ShieldCheck, RefreshCw, Headphones } from "lucide-react";

const trustItems = [
  {
    icon: Truck,
    title: "Free Shipping",
    subtitle: "Orders over ₹999",
  },
  {
    icon: ShieldCheck,
    title: "Secure Payments",
    subtitle: "100% secure checkout",
  },
  {
    icon: RefreshCw,
    title: "Easy Returns",
    subtitle: "30-day return policy",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    subtitle: "Always here to help",
  },
];

export function TrustBar() {
  return (
    <section className="bg-white border-b border-[#E6E6E3] py-8">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {trustItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={i}
                className="trust-card flex items-center gap-3.5 p-3 rounded-2xl bg-[#F7F7F5]/60 border border-[#E6E6E3]/60 transition-all hover:bg-white hover:shadow-sm"
              >
                <div className="trust-icon h-10 w-10 rounded-xl bg-white border border-[#E6E6E3] flex items-center justify-center text-[#F4512C] shadow-2xs flex-shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="trust-title font-bold text-xs text-[#111111] leading-snug">{item.title}</h4>
                  <p className="trust-subtitle text-[11px] text-gray-500 font-medium">{item.subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
