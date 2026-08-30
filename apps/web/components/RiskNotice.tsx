import { ShieldIcon } from "./icons";

export function RiskNotice() {
  return (
    <p className="flex items-start gap-1.5 px-4 py-4 text-[10px] leading-relaxed text-text-tertiary sm:px-6">
      <ShieldIcon className="mt-0.5 h-3 w-3 shrink-0" />
      <span>
        Risk notice: digital asset trading carries substantial risk of loss and may not be suitable
        for all investors.
      </span>
    </p>
  );
}
