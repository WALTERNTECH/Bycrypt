"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function WithdrawalActions({ withdrawalId, status }: { withdrawalId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showProcess, setShowProcess] = useState(false);
  const [reason, setReason] = useState("");
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function call(path: string, body?: object) {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/withdrawals/${withdrawalId}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Failed.");
      return;
    }
    router.refresh();
  }

  if (status === "pending") {
    if (showReject) {
      return (
        <div className="flex items-center gap-1.5">
          <input
            className="w-40 rounded-md border border-border bg-panel-2 px-2 py-1 text-xs text-text-primary outline-none focus:border-brand"
            placeholder="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button
            disabled={loading || !reason}
            onClick={() => call("reject", { reason })}
            className="rounded-md bg-negative/10 px-2 py-1 text-xs font-bold text-negative hover:bg-negative/20"
          >
            Confirm
          </button>
          <button onClick={() => setShowReject(false)} className="text-xs text-text-secondary">
            Cancel
          </button>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <button
          disabled={loading}
          onClick={() => call("approve")}
          className="rounded-md bg-positive/10 px-2.5 py-1 text-xs font-bold text-positive hover:bg-positive/20"
        >
          Approve
        </button>
        <button
          disabled={loading}
          onClick={() => setShowReject(true)}
          className="rounded-md bg-negative/10 px-2.5 py-1 text-xs font-bold text-negative hover:bg-negative/20"
        >
          Reject
        </button>
        {error && <span className="text-xs text-negative">{error}</span>}
      </div>
    );
  }

  if (status === "approved") {
    if (showProcess) {
      return (
        <div className="flex items-center gap-1.5">
          <input
            className="w-40 rounded-md border border-border bg-panel-2 px-2 py-1 text-xs text-text-primary outline-none focus:border-brand"
            placeholder="Payout tx hash"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
          />
          <button
            disabled={loading || !txHash}
            onClick={() => call("process", { tx_hash: txHash })}
            className="rounded-md bg-brand px-2 py-1 text-xs font-bold text-ink hover:bg-brand-hover"
          >
            Confirm
          </button>
          <button onClick={() => setShowProcess(false)} className="text-xs text-text-secondary">
            Cancel
          </button>
        </div>
      );
    }
    return (
      <div>
        <button
          onClick={() => setShowProcess(true)}
          className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-text-primary hover:bg-panel-2"
        >
          Mark paid…
        </button>
        {error && <p className="mt-1 text-xs text-negative">{error}</p>}
      </div>
    );
  }

  return null;
}
