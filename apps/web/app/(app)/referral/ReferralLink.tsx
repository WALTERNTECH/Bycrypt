"use client";

import { useState } from "react";

export function ReferralLink({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}/signup?ref=${code}` : `/signup?ref=${code}`;

  return (
    <div className="rounded-xl border border-border/60 bg-panel p-4">
      <p className="text-xs font-semibold text-text-primary">Your referral link</p>
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-panel-2 px-3 py-2.5">
        <code className="flex-1 truncate text-xs text-text-primary">{link}</code>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="shrink-0 rounded-md bg-brand px-2.5 py-1 text-xs font-bold text-base hover:bg-brand-hover"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-2 text-[10px] text-text-secondary">Code: {code}</p>
    </div>
  );
}
