import type { Config } from "tailwindcss";

// Krypton design system — a light exchange interface, modelled on Bybit.
//
// What makes that style work is restraint, not decoration:
//
//   White carries everything. The page, the cards and the chrome are all
//   white or near-white; separation comes from hairline borders rather
//   than from shadows or competing fills. A busy trading screen with
//   heavy surfaces reads as cluttered immediately.
//
//   Black is the voice. Primary text, numbers and active states are
//   near-black, not grey — on white, weight and darkness carry hierarchy
//   far better than colour does.
//
//   Amber is for action only. Primary buttons and the brand mark. Used
//   anywhere else it stops meaning "press this".
//
// Green and red survive untouched as market semantics: in trading they
// mean up and down, and restyling them to fit a palette would cost
// comprehension for decoration.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Page and elevation. The ladder is deliberately shallow — four
        // near-identical greys — because depth on an exchange screen comes
        // from borders, not from stacked fills.
        base: "#FFFFFF",
        surface: "#FFFFFF",
        "surface-2": "#F7F7F8",
        "surface-3": "#EFEFF2",
        // legacy aliases so existing screens keep compiling
        panel: "#FFFFFF",
        "panel-2": "#F7F7F8",
        // Hairlines. These do the structural work.
        border: "#EAECEF",
        "border-strong": "#D9DCE1",
        // Action only.
        brand: "#F7A600",
        "brand-hover": "#FFB92E",
        // A tinted callout that stays legible on white.
        "brand-dim": "#FFF7E6",
        // Market semantics — Bybit's exact up/down pair.
        positive: "#20B26C",
        "positive-dim": "#E8F7F0",
        negative: "#EF454A",
        "negative-dim": "#FDECEC",
        info: "#2F80ED",
        "info-dim": "#EAF2FD",
        // Text. Near-black rather than pure black: #000 on white vibrates.
        "text-primary": "#121214",
        "text-secondary": "#5B5E66",
        "text-tertiary": "#8A8D94",
        // Text on a bright fill. Named ink because `base` would collide
        // with Tailwind's text-base font-size utility.
        ink: "#121214",
        // App chrome. Now the same family as the page — the header no
        // longer has to contrast against a dark body.
        header: "#FFFFFF",
        "header-2": "#F7F7F8",
        "header-3": "#EFEFF2",
        "header-border": "#EAECEF",
        "header-text": "#121214",
        "header-muted": "#8A8D94",
        "header-dark": "#121214"
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "Segoe UI", "Roboto", "sans-serif"]
      },
      borderRadius: {
        // Tighter than before. Large radii read as consumer-app; exchange
        // interfaces sit around 8px.
        lg: "0.5rem",
        xl: "0.625rem",
        "2xl": "0.75rem"
      },
      boxShadow: {
        // Shadows are nearly absent by design. Where one exists it is a
        // lift of a few pixels, never a glow.
        btn: "none",
        "btn-brand": "0 1px 2px rgba(247,166,0,0.24)",
        "btn-positive": "0 1px 2px rgba(32,178,108,0.24)",
        "btn-negative": "0 1px 2px rgba(239,69,74,0.24)",
        card: "0 1px 2px rgba(18,18,20,0.04)",
        lift: "0 8px 24px -12px rgba(18,18,20,0.18)"
      }
    }
  },
  plugins: []
};

export default config;
