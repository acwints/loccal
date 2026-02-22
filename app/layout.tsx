import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";

import "@/app/globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-sans"
});

export const metadata: Metadata = {
  title: "Loccal",
  description: "Google Calendar monthly location rollup"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body>{children}</body>
    </html>
  );
}
