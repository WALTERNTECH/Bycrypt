export function formatUsdt(value: number | string, opts: { withSymbol?: boolean } = {}): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(n)) return opts.withSymbol ? "$0.00" : "0.00";
  const formatted = n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return opts.withSymbol ? `$${formatted}` : formatted;
}

export function formatPct(value: number | string, opts: { signed?: boolean } = {}): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(n)) return "0.00%";
  const sign = opts.signed && n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function daysRemaining(maturityDate: string | Date): number {
  const d = typeof maturityDate === "string" ? new Date(maturityDate) : maturityDate;
  const diffMs = d.getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export function truncateMiddle(value: string, front = 6, back = 6): string {
  if (value.length <= front + back + 3) return value;
  return `${value.slice(0, front)}...${value.slice(-back)}`;
}
