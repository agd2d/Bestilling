import type { Metadata } from "next";
import AppHeader from "@/components/AppHeader";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hvidbjerg Service - Bestillingssystem",
  description: "Selvstændigt bestillingssystem med fælles Supabase-datalag",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="da"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body>
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
