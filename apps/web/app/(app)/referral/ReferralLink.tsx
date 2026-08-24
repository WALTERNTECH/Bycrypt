"use client";

import { useState } from "react";

export function ReferralLink({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}/signup?ref=${code}` : `/signup?ref=${code}`;

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-card p-4">
      <p className="text-xs font-semibold text-text-primary">Your referral link</p>
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2.5">
        <code className="flex-1 truncate text-xs text-text-primary">{link}</code>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="shrink-0 rounded-lg border border-[#C9990A] bg-gradient-to-b from-brand-hover to-brand px-3 py-1.5 text-xs font-bold text-ink shadow-btn-brand transition-all duration-150 hover:from-[#FFD84D] hover:to-[#F7C21A] active:translate-y-px active:shadow-none"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-2 text-[10px] text-text-secondary">Code: {code}</p>
    </div>
  );
}
