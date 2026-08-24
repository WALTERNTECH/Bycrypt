export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-extrabold tracking-tight ${className}`}>
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-ink font-black text-[15px]">
        B
      </span>
      <span className="text-text-primary text-lg">Krypton</span>
      <span className="rounded-md bg-panel-2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-text-secondary">
        Admin
      </span>
    </span>
  );
}
