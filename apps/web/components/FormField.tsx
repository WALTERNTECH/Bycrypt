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
  "w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-base md:text-[13px] font-medium text-text-primary placeholder:font-normal placeholder:text-text-tertiary outline-none transition-colors duration-100 focus:border-brand focus:bg-surface focus:ring-1 focus:ring-brand/30";

export const buttonClass =
  "inline-flex w-full items-center justify-center gap-2 rounded-lg border border-transparent bg-brand py-3 text-[14px] font-semibold leading-none text-ink transition-colors duration-100 hover:bg-brand-hover active:opacity-80 disabled:cursor-not-allowed disabled:opacity-40";
