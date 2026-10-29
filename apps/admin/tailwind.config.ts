import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Matches the web app: a light exchange interface modelled on Bybit.
      // White carries the structure, near-black is the voice, amber means
      // action and nothing else. Green and red stay as market semantics.
      colors: {
        base: "#FFFFFF",
        surface: "#FFFFFF",
        "surface-2": "#F7F7F8",
        "surface-3": "#EFEFF2",
        // legacy aliases so existing admin screens keep compiling
        panel: "#FFFFFF",
        "panel-2": "#F7F7F8",
        border: "#EAECEF",
        "border-strong": "#D9DCE1",
        brand: "#F7A600",
        "brand-hover": "#FFB92E",
        "brand-dim": "#FFF7E6",
        positive: "#20B26C",
        "positive-dim": "#E8F7F0",
        negative: "#EF454A",
        "negative-dim": "#FDECEC",
        info: "#2F80ED",
        "info-dim": "#EAF2FD",
        "text-primary": "#121214",
        "text-secondary": "#4A4E57",
        "text-tertiary": "#6B7079",
        // text on a bright fill — deliberately NOT named "base", which
        // collides with Tailwind's text-base font-size utility
        ink: "#121214"
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "Segoe UI", "Roboto", "sans-serif"]
      },
      boxShadow: {
        btn: "inset 0 1px 0 rgba(255,255,255,0.16), 0 1px 2px rgba(0,0,0,0.4)",
        "btn-brand": "inset 0 1px 0 rgba(255,255,255,0.28), 0 4px 14px rgba(240,185,11,0.22)",
        card: "0 1px 2px rgba(0,0,0,0.35), 0 8px 24px -12px rgba(0,0,0,0.6)"
      }
    }
  },
  plugins: []
};

export default config;
