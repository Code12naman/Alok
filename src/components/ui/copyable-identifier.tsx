"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CopyableIdentifierProps {
  label: string;
  value: string;
  className?: string;
  showValue?: boolean;
}

export function CopyableIdentifier({ label, value, className = "", showValue = true }: CopyableIdentifierProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <span className={`inline-flex max-w-full min-w-0 items-center gap-1.5 ${className}`}>
      <span title={value} className={showValue ? "min-w-0 truncate font-mono tracking-wide" : "sr-only"}>
        {value}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={`Copy ${label}`}
        title={`Copy ${label}`}
        className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-black/10 dark:hover:bg-white/10"
      >
        {copyState === "copied" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <span className="sr-only" aria-live="polite">
        {copyState === "copied" ? `${label} copied` : copyState === "failed" ? `Could not copy ${label}` : ""}
      </span>
    </span>
  );
}
