import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { OrganizationProvider } from "@/features/organizations/components/organization-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TIC Marketplace",
  description:
    "Professional B2B marketplace foundation for testing, inspection, and certification services.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900 antialiased">
        <OrganizationProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </OrganizationProvider>
      </body>
    </html>
  );
}
