import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0B0E11",
        panel: "#181A20",
        "panel-2": "#1E2026",
        border: "#2B3139",
        brand: "#F0B90B",
        "brand-hover": "#F8D33A",
        positive: "#0ECB81",
        negative: "#F6465D",
        "text-primary": "#EAECEF",
        "text-secondary": "#848E9C"
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "Segoe UI", "Roboto", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
