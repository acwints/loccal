import type { Metadata } from "next";

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
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
