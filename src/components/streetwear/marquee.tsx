"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

type MarqueeProps = {
  text: string;
};

export function Marquee({ text }: MarqueeProps) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const context = gsap.context(() => {
      gsap.to("[data-marquee-track]", {
        xPercent: -50,
        duration: 18,
        ease: "none",
        repeat: -1,
      });
    }, wrapRef);

    return () => context.revert();
  }, []);

  return (
    <div ref={wrapRef} className="overflow-hidden border-y border-black/10 bg-black text-white">
      <div data-marquee-track className="flex w-[200%] items-center py-4">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="flex w-1/2 items-center justify-around whitespace-nowrap px-4">
            {Array.from({ length: 6 }).map((__, itemIndex) => (
              <span key={itemIndex} className="text-xs font-semibold uppercase tracking-[0.38em] text-white/90">
                {text}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}