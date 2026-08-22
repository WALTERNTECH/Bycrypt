"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/FormField";

export function MoveToWalletButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/referral/move-to-wallet", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    router.push("/withdraw");
    router.refresh();
  }

  return (
    <div>
      <button onClick={handleClick} disabled={loading} className={buttonClass}>
        {loading ? "Moving…" : "Move to wallet & withdraw →"}
      </button>
      {error && <p className="mt-2 text-xs text-negative">{error}</p>}
    </div>
  );
}
