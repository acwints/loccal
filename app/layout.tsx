import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import { MobileApp } from "@/components/mobile-app";

import "@/app/globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-sans"
});

export const metadata: Metadata = {
  title: "Loccal",
  description: "Your calendar, city by city. Find out where your plans overlap with friends.",
  appleWebApp: { capable: true, title: "Loccal", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f8fc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d11" }
  ]
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body><MobileApp />{children}</body>
    </html>
  );
}
