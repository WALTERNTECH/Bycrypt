"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function KycReviewActions({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function call(action: "approve" | "reject") {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/kyc/${submissionId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: action === "reject" ? JSON.stringify({ reason }) : undefined
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Failed.");
      return;
    }
    router.refresh();
  }

  if (showReject) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="w-56 rounded-md border border-border bg-panel-2 px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-brand"
          placeholder="Reason (shown to the user)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <button
          disabled={loading || !reason}
          onClick={() => call("reject")}
          className="rounded-md bg-negative/10 px-3 py-1.5 text-xs font-bold text-negative hover:bg-negative/20"
        >
          Confirm reject
        </button>
        <button onClick={() => setShowReject(false)} className="text-xs text-text-secondary">
          Cancel
        </button>
        {error && <span className="text-xs text-negative">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        disabled={loading}
        onClick={() => call("approve")}
        className="rounded-md bg-positive/10 px-3 py-1.5 text-xs font-bold text-positive hover:bg-positive/20"
      >
        Approve
      </button>
      <button
        disabled={loading}
        onClick={() => setShowReject(true)}
        className="rounded-md bg-negative/10 px-3 py-1.5 text-xs font-bold text-negative hover:bg-negative/20"
      >
        Reject
      </button>
      {error && <span className="text-xs text-negative">{error}</span>}
    </div>
  );
}
