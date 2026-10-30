"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * The home carousel.
 *
 * Seven slides on a light panel, advancing themselves, swipeable, with a
 * counter — the shape an exchange uses to put its programmes in front of
 * someone without a menu.
 *
 * The art is inline SVG rather than bitmaps. It is sharp at any density,
 * costs no network request on a screen people open constantly, and can be
 * animated and themed from the same tokens as the rest of the app. A
 * folder of PNGs would do none of that.
 *
 * Every slide here points at something this app actually does, and the
 * only figure quoted — the $500 referral — is the one the platform is
 * configured to pay. Slides are read from config so an operator can
 * change them, which also means a promise on this carousel is one someone
 * deliberately put there.
 */

export interface PromoSlide {
  id: string;
  eyebrow: string;
  title: string;
  href: string;
  art: ArtKind;
  external?: boolean;
}

type ArtKind = "gift" | "bitcoin" | "target" | "scan" | "chart" | "statement" | "support";

const ROTATE_MS = 4800;

export function PromoCarousel({ slides }: { slides: PromoSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const count = slides.length;

  const go = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count]
  );

  useEffect(() => {
    if (paused || count < 2) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const id = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => clearInterval(id);
  }, [paused, count]);

  if (count === 0) return null;

  return (
    <section
      className="relative mt-5 overflow-hidden rounded-xl bg-surface-2"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        setPaused(true);
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        setPaused(false);
        const start = touchStartX.current;
        const end = e.changedTouches[0]?.clientX ?? null;
        touchStartX.current = null;
        if (start === null || end === null) return;
        const dx = end - start;
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
      }}
      aria-roledescription="carousel"
    >
      {/* The dotted texture Bybit uses to stop a flat grey panel reading
          as an empty placeholder. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage: "radial-gradient(#D9DCE1 1px, transparent 1px)",
          backgroundSize: "14px 14px"
        }}
      />

      <div className="absolute right-2.5 top-2.5 z-10 rounded-full bg-base/80 px-2 py-0.5 text-[10px] font-bold text-text-secondary backdrop-blur">
        {index + 1}/{count}
      </div>

      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((slide, i) => (
          <Slide key={slide.id} slide={slide} active={i === index} />
        ))}
      </div>

      <div className="absolute bottom-2.5 left-4 z-10 flex gap-1.5">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            onClick={() => go(i)}
            aria-label={`Show slide ${i + 1}: ${slide.title}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === index ? "w-5 bg-brand" : "w-1.5 bg-border-strong"
            }`}
          />
        ))}
      </div>
    </section>
  );
}

function Slide({ slide, active }: { slide: PromoSlide; active: boolean }) {
  const inner = (
    <div className="relative flex w-full shrink-0 items-center gap-3 px-4 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-brand">{slide.eyebrow}</p>
        <p className="mt-1 text-[15px] font-bold leading-snug text-text-primary">{slide.title}</p>
        <span className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-text-secondary">
          Learn more
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} className="h-3 w-3">
            <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      <div className={`shrink-0 ${active ? "promo-art-in" : ""}`}>
        <Art kind={slide.art} />
      </div>
    </div>
  );

  return (
    <div className="w-full shrink-0" style={{ flex: "0 0 100%" }}>
      {slide.external ? (
        <a href={slide.href} target="_blank" rel="noopener noreferrer">
          {inner}
        </a>
      ) : (
        <Link href={slide.href}>{inner}</Link>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Art                                                                 */
/* ------------------------------------------------------------------ */

const GOLD = "#F7A600";

function Art({ kind }: { kind: ArtKind }) {
  const common = { width: 92, height: 72, viewBox: "0 0 92 72", fill: "none" } as const;

  switch (kind) {
    case "gift":
      return (
        <svg {...common} aria-hidden>
          <defs>
            <linearGradient id="g-gift" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFC94D" />
              <stop offset="100%" stopColor="#F7A600" />
            </linearGradient>
          </defs>
          <ellipse cx="46" cy="63" rx="30" ry="5" fill="#121214" opacity="0.07" />
          <rect x="24" y="28" width="44" height="32" rx="5" fill="url(#g-gift)" />
          <rect x="20" y="20" width="52" height="12" rx="4" fill="#FFD98A" />
          <rect x="42" y="20" width="8" height="40" fill="#FFF2CE" />
          <path d="M46 20c-6-9-18-6-14 1 3 5 10 4 14-1Z" fill="#FFD98A" />
          <path d="M46 20c6-9 18-6 14 1-3 5-10 4-14-1Z" fill="#FFD98A" />
          <circle cx="76" cy="16" r="3.5" fill={GOLD} className="promo-float" />
          <circle cx="14" cy="42" r="2.5" fill={GOLD} className="promo-float-slow" />
        </svg>
      );

    case "bitcoin":
      return (
        <svg {...common} aria-hidden>
          <defs>
            <linearGradient id="g-btc" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFC94D" />
              <stop offset="100%" stopColor="#F7931A" />
            </linearGradient>
          </defs>
          <ellipse cx="46" cy="64" rx="26" ry="4.5" fill="#121214" opacity="0.07" />
          <circle cx="46" cy="36" r="22" fill="url(#g-btc)" className="promo-float" />
          <text
            x="46"
            y="46"
            textAnchor="middle"
            fontSize="26"
            fontWeight="700"
            fill="#FFFFFF"
            fontFamily="Inter, sans-serif"
          >
            ₿
          </text>
          <path d="M70 54l6 6M76 54l-6 6" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
          <circle cx="16" cy="20" r="3" fill={GOLD} className="promo-float-slow" />
        </svg>
      );

    case "target":
      return (
        <svg {...common} aria-hidden>
          <ellipse cx="46" cy="64" rx="26" ry="4.5" fill="#121214" opacity="0.07" />
          <circle cx="46" cy="34" r="22" fill="#FFF0CC" />
          <circle cx="46" cy="34" r="14" fill="#FFE1A3" />
          <circle cx="46" cy="34" r="6" fill={GOLD} />
          <path
            d="M46 34 78 12"
            stroke="#121214"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="promo-float"
          />
          <path d="M72 12h8v8" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case "scan":
      return (
        <svg {...common} aria-hidden>
          <ellipse cx="46" cy="64" rx="26" ry="4.5" fill="#121214" opacity="0.07" />
          <rect x="22" y="12" width="48" height="44" rx="6" fill="#FFF0CC" />
          <path d="M30 42l8-10 7 7 11-15" stroke={GOLD} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="56" cy="24" r="3.5" fill={GOLD} />
          <rect x="26" y="48" width="18" height="3" rx="1.5" fill="#E3C788" />
          <g className="promo-scanline">
            <rect x="22" y="12" width="48" height="2.5" rx="1.25" fill={GOLD} opacity="0.65" />
          </g>
        </svg>
      );

    case "chart":
      return (
        <svg {...common} aria-hidden>
          <ellipse cx="46" cy="64" rx="26" ry="4.5" fill="#121214" opacity="0.07" />
          <rect x="24" y="36" width="9" height="20" rx="2.5" fill="#FFE1A3" />
          <rect x="37" y="26" width="9" height="30" rx="2.5" fill="#FFD27A" />
          <rect x="50" y="16" width="9" height="40" rx="2.5" fill={GOLD} className="promo-grow" />
          <rect x="63" y="30" width="9" height="26" rx="2.5" fill="#FFD27A" />
          <path d="M22 30 36 18l10 8L74 8" stroke="#20B26C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M66 8h8v8" stroke="#20B26C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case "statement":
      return (
        <svg {...common} aria-hidden>
          <ellipse cx="46" cy="64" rx="26" ry="4.5" fill="#121214" opacity="0.07" />
          <rect x="26" y="10" width="40" height="48" rx="5" fill="#FFFFFF" stroke="#E3C788" strokeWidth="2" />
          <rect x="33" y="20" width="26" height="3.5" rx="1.75" fill="#FFE1A3" />
          <rect x="33" y="29" width="20" height="3.5" rx="1.75" fill="#FFE1A3" />
          <rect x="33" y="38" width="24" height="3.5" rx="1.75" fill="#FFE1A3" />
          <circle cx="63" cy="48" r="11" fill={GOLD} className="promo-float" />
          <path d="M63 43v10M59 49l4 4 4-4" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case "support":
    default:
      return (
        <svg {...common} aria-hidden>
          <ellipse cx="46" cy="64" rx="26" ry="4.5" fill="#121214" opacity="0.07" />
          <rect x="20" y="14" width="44" height="32" rx="8" fill="#FFF0CC" />
          <path d="M30 46v8l10-8" fill="#FFF0CC" />
          <circle cx="34" cy="30" r="3" fill={GOLD} />
          <circle cx="42" cy="30" r="3" fill={GOLD} />
          <circle cx="50" cy="30" r="3" fill={GOLD} />
          <circle cx="70" cy="22" r="9" fill={GOLD} className="promo-float" />
          <path d="M66 22l3 3 5-6" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}
