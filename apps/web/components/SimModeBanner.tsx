import { SIM_MARKET } from "@/lib/position";

/**
 * Says so, on every screen, whenever position figures are simulated.
 *
 * A testing mode that looks identical to the real thing is how a test
 * figure ends up quoted to someone as a real one. This renders nothing at
 * all when the mode is off, which is its state in any deployment that
 * does not explicitly set the variable.
 */
export function SimModeBanner() {
  if (!SIM_MARKET) return null;

  return (
    <div className="flex items-center gap-2 bg-[#17181C] px-4 py-2 text-white">
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-ink">
        !
      </span>
      <p className="text-[11px] leading-tight">
        <span className="font-bold">Simulated market.</span>{" "}
        <span className="text-white/70">
          Position gains and losses are generated for testing and are not real market results.
        </span>
      </p>
    </div>
  );
}
