"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function MarkAllRead() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/notifications/read-all", { method: "POST" });
        setBusy(false);
        router.refresh();
      }}
    >
      {busy ? "Marking…" : "Mark all read"}
    </Button>
  );
}
