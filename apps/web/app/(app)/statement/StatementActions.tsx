"use client";

import { Button } from "@/components/ui";

interface Row {
  when: string;
  kind: string;
  detail: string;
  value: number;
}

/**
 * Print and download.
 *
 * Printing is the browser's own dialogue, which on every modern platform
 * includes "Save as PDF" — that gives a real PDF without shipping a PDF
 * library to every visitor for a page most will never open.
 *
 * The download is CSV rather than a second PDF, because the two are for
 * different jobs: the printed sheet is the document, the CSV is the data
 * someone can actually reconcile in a spreadsheet.
 */
export function StatementActions({ rows, monthName }: { rows: Row[]; monthName: string }) {
  function download() {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [
      ["Date", "Type", "Detail", "Amount (USD)"].map(esc).join(","),
      ...rows.map((r) =>
        [
          esc(new Date(r.when).toISOString().slice(0, 10)),
          esc(r.kind),
          esc(r.detail),
          r.value.toFixed(2)
        ].join(",")
      )
    ].join("\r\n");

    // A BOM so Excel opens it as UTF-8 rather than mangling the currency
    // and symbol characters.
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `krypton-statement-${monthName.toLowerCase().replace(/\s+/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex shrink-0 gap-2">
      <Button variant="secondary" size="sm" onClick={download}>
        Download
      </Button>
      <Button variant="primary" size="sm" onClick={() => window.print()}>
        Print
      </Button>
    </div>
  );
}
