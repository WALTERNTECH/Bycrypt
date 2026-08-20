import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Krypton Admin",
  description: "Operational control centre for the Krypton platform — staff only.",
  robots: { index: false, follow: false },
  icons: { icon: "data:," }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-base text-text-primary min-h-screen antialiased">{children}</body>
    </html>
  );
}
