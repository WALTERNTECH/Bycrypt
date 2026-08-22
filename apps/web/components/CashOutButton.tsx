"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CashOutButton({ investmentId }: { investmentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/investments/${investmentId}/cashout`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not cash out.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-3">
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-lg bg-positive/10 px-3.5 py-2 text-xs font-bold text-positive transition-colors hover:bg-positive/20 disabled:opacity-50"
      >
        {loading ? "Moving to wallet…" : "Cash out to wallet →"}
      </button>
      {error && <p className="mt-1.5 text-xs text-negative">{error}</p>}
    </div>
  );
}
