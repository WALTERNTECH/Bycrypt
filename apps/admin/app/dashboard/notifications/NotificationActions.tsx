"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MarkReadButton({ notificationId }: { notificationId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    await fetch(`/api/notifications/${notificationId}/read`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="shrink-0 rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-text-primary hover:bg-panel-2 disabled:opacity-50"
    >
      {loading ? "…" : "Mark read"}
    </button>
  );
}

export function MarkAllReadButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    await fetch("/api/notifications/read-all", { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-lg border border-border px-3.5 py-2 text-xs font-semibold text-text-primary hover:bg-panel-2 disabled:opacity-50"
    >
      {loading ? "…" : "Mark all read"}
    </button>
  );
}
