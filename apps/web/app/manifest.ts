import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest. Chrome will not fire
// beforeinstallprompt (and so the install banner never appears) unless
// this has a name, a start_url, a standalone display mode, and both a
// 192px and a 512px icon — all four are load-bearing, not decoration.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Krypton — Automated Crypto Trading & Custody",
    short_name: "Krypton",
    description:
      "Deposit USDT, open a position, and track it live. Krypton's automated strategy, your wallet, one app.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0A0D12",
    theme_color: "#FFFFFF",
    categories: ["finance"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android crops to a platform shape; these keep the mark inside
      // the safe zone so it isn't clipped.
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ],
    shortcuts: [
      { name: "Deposit", url: "/deposit" },
      { name: "Trade", url: "/trade" },
      { name: "Positions", url: "/investments" }
    ]
  };
}
