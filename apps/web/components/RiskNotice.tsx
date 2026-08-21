import { ShieldIcon } from "./icons";

export function RiskNotice() {
  return (
    <p className="flex items-start gap-1.5 px-4 py-3 text-[10.5px] leading-relaxed text-text-secondary/80 sm:px-6">
      <ShieldIcon className="mt-0.5 h-3 w-3 shrink-0" />
      Risk notice: digital asset trading carries substantial risk of loss and may not be suitable
      for all investors. Returns are variable, capped maximums — never guaranteed. Only invest
      what you can afford to lose.
    </p>
  );
}
