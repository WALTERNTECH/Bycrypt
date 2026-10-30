import type { PromoSlide } from "@/components/PromoCarousel";

/**
 * The home carousel's slides.
 *
 * Read from platform_config under `home_promos` so an operator can change
 * them without a deploy, falling back to the set below.
 *
 * Every default points at something this app actually does, and the only
 * figure any of them quotes is the referral bonus, which is read from the
 * same config the payout uses — so the carousel cannot advertise $500
 * while the platform pays $100. Adding a slide that promises something
 * new means building the thing that honours it first; this carousel is
 * seen by people deciding where to put money.
 */

const ART = ["gift", "bitcoin", "target", "scan", "chart", "statement", "support"] as const;

export function defaultPromos(referralBonus: number, telegramUrl: string): PromoSlide[] {
  const bonus = Number.isFinite(referralBonus) && referralBonus > 0 ? Math.round(referralBonus) : 500;

  return [
    {
      id: "referral",
      eyebrow: "Invite friends",
      title: `Earn $${bonus} when someone you invite makes their first deposit`,
      href: "/referral",
      art: "gift"
    },
    {
      id: "deposit",
      eyebrow: "Funding",
      title: "Send Bitcoin, press Verify. No transaction ID to copy across",
      href: "/deposit",
      art: "bitcoin"
    },
    {
      id: "target",
      eyebrow: "Auto-close",
      title: "Set the return that closes your position, then walk away",
      href: "/trade",
      art: "target"
    },
    {
      id: "scan",
      eyebrow: "Market scan",
      title: "A buy or sell read on the timeframe you choose, before you commit",
      href: "/trade",
      art: "scan"
    },
    {
      id: "live",
      eyebrow: "Live P&L",
      title: "Watch your position from the price you entered at to the price you leave",
      href: "/assets",
      art: "chart"
    },
    {
      id: "statement",
      eyebrow: "Statements",
      title: "Download a record of every deposit, position and withdrawal",
      href: "/statement",
      art: "statement"
    },
    {
      id: "support",
      eyebrow: "Support",
      title: "Talk to Krypton Support on Telegram, any hour",
      href: telegramUrl,
      art: "support",
      external: true
    }
  ];
}

/** Validates operator-supplied slides; anything malformed is ignored in
 *  favour of the defaults rather than rendering a broken panel. */
export function parsePromos(raw: unknown): PromoSlide[] | null {
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(value) || value.length === 0) return null;

  const slides: PromoSlide[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const { id, eyebrow, title, href, art, external } = item as Record<string, unknown>;
    if (typeof id !== "string" || typeof title !== "string" || typeof href !== "string") continue;
    if (!title.trim() || !href.trim()) continue;
    slides.push({
      id,
      eyebrow: typeof eyebrow === "string" ? eyebrow : "Krypton",
      title,
      href,
      art: (ART as readonly string[]).includes(String(art)) ? (art as PromoSlide["art"]) : "gift",
      external: external === true
    });
  }
  return slides.length > 0 ? slides : null;
}
