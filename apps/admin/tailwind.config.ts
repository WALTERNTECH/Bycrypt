import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0A0D12",
        surface: "#12161C",
        "surface-2": "#191E26",
        "surface-3": "#212832",
        // legacy aliases so existing admin screens keep compiling
        panel: "#12161C",
        "panel-2": "#191E26",
        border: "#232A34",
        "border-strong": "#333C49",
        brand: "#F0B90B",
        "brand-hover": "#FFCD1F",
        positive: "#0ECB81",
        negative: "#F6465D",
        "text-primary": "#EDF0F3",
        "text-secondary": "#8B95A5",
        "text-tertiary": "#5D6673",
        // text on a bright fill — deliberately NOT named "base", which
        // collides with Tailwind's text-base font-size utility
        ink: "#0A0D12"
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
