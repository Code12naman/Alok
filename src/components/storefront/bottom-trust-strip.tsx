import { Shield, Sparkles, Truck, ThumbsUp } from "lucide-react";

const serviceItems = [
  {
    icon: Sparkles,
    title: "Premium Quality",
    desc: "Made with the finest materials",
  },
  {
    icon: Truck,
    title: "Fast Delivery",
    desc: "Quick and reliable shipping",
  },
  {
    icon: Shield,
    title: "Secure Checkout",
    desc: "Your data is protected",
  },
  {
    icon: ThumbsUp,
    title: "Customer Satisfaction",
    desc: "100% satisfaction guarantee",
  },
];

export function BottomTrustStrip() {
  return (
    <section className="bg-[#F7F7F5] border-y border-[#E6E6E3] py-8">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          {serviceItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex flex-col items-center justify-center p-2">
                <div className="h-10 w-10 rounded-full bg-white border border-[#E6E6E3] flex items-center justify-center text-[#F4512C] mb-2 shadow-2xs">
                  <Icon className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-xs text-[#111111]">{item.title}</h4>
                <p className="text-[11px] text-gray-500 font-medium">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
