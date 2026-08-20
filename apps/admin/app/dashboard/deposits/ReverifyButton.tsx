"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReverifyButton({ depositId }: { depositId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setMessage(null);
    const res = await fetch(`/api/deposits/${depositId}/reverify`, { method: "POST" });
    const data = await res.json();
    setLoading(false);
    setMessage(data.message ?? data.error ?? "Done.");
    router.refresh();
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-text-primary transition-colors hover:bg-panel-2 disabled:opacity-50"
      >
        {loading ? "Checking…" : "Reverify"}
      </button>
      {message && <p className="mt-1 max-w-[220px] text-xs text-text-secondary">{message}</p>}
    </div>
  );
}
