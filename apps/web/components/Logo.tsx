export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-extrabold tracking-tight ${className}`}>
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-b from-brand-hover to-brand text-[15px] font-black text-ink shadow-btn-brand">
        K
      </span>
      <span className="text-lg text-text-primary">Krypton</span>
    </span>
  );
}
