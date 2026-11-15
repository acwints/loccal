import type { Metadata } from "next";
import { preload } from "react-dom";

import "@/app/fonts.css";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Loccal",
  description: "Google Calendar monthly location rollup"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Same preload next/font/google emitted: only the latin slice (latin-ext loads on demand).
  preload("/fonts/dm-sans-latin.b228458c.woff2", {
    as: "font",
    type: "font/woff2",
    crossOrigin: ""
  });

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
