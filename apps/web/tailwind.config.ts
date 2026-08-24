import type { Config } from "tailwindcss";

// Krypton design system — exchange-grade dark theme (Binance/OKX lineage).
// Surfaces are layered by elevation so panels read as distinct planes
// instead of one flat sheet, and every interactive colour has a dim
// companion for tinted backgrounds.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // elevation ladder
        base: "#0A0D12",
        surface: "#12161C",
        "surface-2": "#191E26",
        "surface-3": "#212832",
        // legacy aliases (kept so existing screens keep compiling)
        panel: "#12161C",
        "panel-2": "#191E26",
        // lines
        border: "#232A34",
        "border-strong": "#333C49",
        // brand
        brand: "#F0B90B",
        "brand-hover": "#FFCD1F",
        "brand-dim": "#2A2410",
        // semantics
        positive: "#0ECB81",
        "positive-dim": "#0C2A22",
        negative: "#F6465D",
        "negative-dim": "#2E1620",
        info: "#3B8EF0",
        "info-dim": "#12243C",
        // text
        "text-primary": "#EDF0F3",
        "text-secondary": "#8B95A5",
        "text-tertiary": "#5D6673",
        // text that sits on top of a bright fill (gold/green/red)
        ink: "#0A0D12"
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "Segoe UI", "Roboto", "sans-serif"]
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem"
      },
      boxShadow: {
        // tactile button depth: inner top highlight + outer drop
        btn: "inset 0 1px 0 rgba(255,255,255,0.16), 0 1px 2px rgba(0,0,0,0.4)",
        "btn-brand": "inset 0 1px 0 rgba(255,255,255,0.28), 0 4px 14px rgba(240,185,11,0.22)",
        "btn-positive": "inset 0 1px 0 rgba(255,255,255,0.22), 0 4px 14px rgba(14,203,129,0.20)",
        "btn-negative": "inset 0 1px 0 rgba(255,255,255,0.22), 0 4px 14px rgba(246,70,93,0.20)",
        card: "0 1px 2px rgba(0,0,0,0.35), 0 8px 24px -12px rgba(0,0,0,0.6)",
        lift: "0 12px 32px -12px rgba(0,0,0,0.75)"
      }
    }
  },
  plugins: []
};

export default config;
