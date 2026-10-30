"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

/**
 * Download and print.
 *
 * The download is a PNG, not a spreadsheet. A statement of what an
 * account did is a document rather than a working file: it should look
 * the same to everyone, open instantly on a phone without an app that
 * reads .xlsx, and be awkward to edit. A spreadsheet is the opposite of
 * all three, and it arrived looking like something still being worked on.
 *
 * It is rendered server-side at a fixed size, so the image is identical
 * whatever downloaded it — no dependence on the fonts, zoom level or
 * renderer of the device that asked.
 *
 * Printing stays, because the browser's own dialogue includes "Save as
 * PDF" on every modern platform, and that gives a real PDF without
 * shipping a PDF library to every visitor.
 */
export function StatementActions() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/report/image", { cache: "no-store" });
      if (!res.ok) {
        setError("Could not build the report just now. Try again in a moment.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `krypton-report-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Revoked on the next tick: Safari cancels the download if the URL
      // goes away in the same one.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("Could not reach the server. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => window.print()}>
          Print
        </Button>
        <Button variant="primary" size="sm" onClick={download} disabled={busy}>
          {busy ? "Building…" : "Download report"}
        </Button>
      </div>
      {error && <p className="text-[11px] text-negative">{error}</p>}
    </div>
  );
}
