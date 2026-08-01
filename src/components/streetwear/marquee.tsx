"use client";

type MarqueeProps = { text: string };

const ITEMS = [
  "INSPIRED BY THE STREETS",
  "BUILT FOR MOVEMENT",
  "LIMITED DROPS",
  "PREMIUM ESSENTIALS",
  "URBAN CULTURE",
  "PRECISION CUT",
];

export function Marquee({ text: _text }: MarqueeProps) {
  return (
    <div
      className="overflow-hidden border-y border-black/10 bg-black text-white"
      aria-hidden="true"
    >
      <div
        className="marquee-track flex items-center whitespace-nowrap py-3.5"
        style={{ animation: "marquee-scroll 28s linear infinite" }}
      >
        {/* Duplicate content twice so -50% translateX creates a seamless loop */}
        {[0, 1].map((copyIdx) => (
          <div key={copyIdx} className="flex shrink-0 items-center">
            {ITEMS.map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-5 px-6 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/90"
              >
                <span className="text-[#ff6a00] text-sm leading-none" aria-hidden="true">
                  •
                </span>
                {item}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}