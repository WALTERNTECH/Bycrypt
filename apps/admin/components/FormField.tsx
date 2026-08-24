export function FormField({
  label,
  children,
  hint
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-text-primary">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-text-secondary">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-border bg-panel-2 px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/60 outline-none transition-colors focus:border-brand";

export const buttonClass =
  "rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60";

export const dangerButtonClass =
  "rounded-lg bg-negative/10 px-4 py-2.5 text-sm font-bold text-negative transition-colors hover:bg-negative/20 disabled:cursor-not-allowed disabled:opacity-60";

export const secondaryButtonClass =
  "rounded-lg border border-border px-4 py-2.5 text-sm font-bold text-text-primary transition-colors hover:bg-panel-2 disabled:cursor-not-allowed disabled:opacity-60";
