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
      <span className="mb-1.5 block text-xs font-bold text-text-secondary">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[11px] leading-relaxed text-text-tertiary">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-border-strong bg-surface-2 px-3.5 py-3 text-base md:text-sm font-medium text-text-primary placeholder:font-normal placeholder:text-text-tertiary outline-none transition-all duration-150 focus:border-brand focus:bg-surface-3 focus:ring-2 focus:ring-brand/20";

export const buttonClass =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#C9990A] bg-gradient-to-b from-brand-hover to-brand py-3 text-sm font-bold leading-none text-ink shadow-btn-brand transition-all duration-150 hover:from-[#FFD84D] hover:to-[#F7C21A] active:translate-y-px active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0";
