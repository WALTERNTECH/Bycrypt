import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Krypton — Automated Crypto Trading & Custody",
  description:
    "Deposit USDT, choose a lockup period, and let Krypton's automated trading strategy work for you. Live crypto markets, transparent tiers, real on-chain deposits.",
  icons: { icon: "data:," },
  // Treated as an installed app rather than a page: no browser chrome
  // when launched from the home screen, and a status bar that matches
  // the header instead of a white strip above it.
  appleWebApp: {
    capable: true,
    title: "Krypton",
    statusBarStyle: "default"
  },
  formatDetection: { telephone: false, date: false, address: false, email: false }
};

// This is an application, not a document. Pinch-zoom and the iOS
// focus-zoom (which fires on any input under 16px and leaves the page
// scaled and panned afterwards) both make it feel like a web page, so
// scaling is locked to 1.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#ffffff"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-base text-text-primary antialiased">{children}</body>
    </html>
  );
}
