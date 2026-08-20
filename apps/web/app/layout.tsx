import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Krypton — Automated Crypto Trading & Custody",
  description:
    "Deposit USDT, choose a lockup period, and let Krypton's automated trading strategy work for you. Live crypto markets, transparent tiers, real on-chain deposits.",
  icons: { icon: "data:," }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-base text-text-primary min-h-screen antialiased">{children}</body>
    </html>
  );
}
