export function formatUsdt(value: number | string, opts: { withSymbol?: boolean } = {}): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(n)) return opts.withSymbol ? "$0.00" : "0.00";
  const formatted = n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return opts.withSymbol ? `$${formatted}` : formatted;
}

export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function truncateMiddle(value: string, front = 8, back = 8): string {
  if (!value || value.length <= front + back + 3) return value;
  return `${value.slice(0, front)}...${value.slice(-back)}`;
}
