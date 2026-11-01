"use client";

import Link from "next/link";
import { ArrowRight, Mail, MapPin, Phone } from "lucide-react";
import type { ReactNode } from "react";

import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import { isProviderAdmin } from "@/features/organizations/utils/permissions";
import { appName, routes } from "@/lib/constants";

/* Palette: Terracotta + Deep Teal
   dark band #0B3440 · terracotta #E36F47 · peach #F2A98B · text white/70 */

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1 text-white/70 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2A98B]"
    >
      {children}
      <ArrowRight
        className="h-3 w-3 -translate-x-1 text-[#F2A98B] opacity-0 transition duration-200 group-hover:translate-x-0 group-hover:opacity-100"
        aria-hidden
      />
    </Link>
  );
}

function ColumnHeading({ children }: { children: ReactNode }) {
  return <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#F2A98B]">{children}</h3>;
}

export function Footer() {
  const year = new Date().getFullYear();
  const { activeOrganization, activeContext } = useOrganizations();
  const showIndependents = isProviderAdmin(activeOrganization, activeContext);

  return (
    <footer className="relative overflow-hidden bg-[#0B3440] text-white">
      {/* top accent line + soft glows */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#E36F47]/70 to-transparent"
      />
      <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#1B7F8C]/30 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-28 -right-16 h-72 w-72 rounded-full bg-[#E36F47]/15 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr] lg:px-8">
        <div>
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#1B7F8C] to-[#0F4C5C] text-base font-bold text-white ring-1 ring-white/20 shadow-[0_10px_20px_-10px_rgba(0,0,0,0.6)]"
            >
              {appName.charAt(0).toUpperCase()}
            </span>
            <p className="font-display text-xl font-bold tracking-tight">{appName}</p>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
            Connecting companies with trusted testing, inspection, certification, and ESG service partners.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/rfq/new"
              className="inline-flex items-center gap-2 rounded-xl bg-[#E36F47] px-4 py-2.5 text-sm font-semibold text-[#0B2530] shadow-[0_12px_30px_-12px_rgba(227,111,71,0.9)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#F2A98B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Request Quote <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/join"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition duration-200 hover:border-white/40 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Join as Provider
            </Link>
          </div>
        </div>

        <nav aria-label="Company">
          <ColumnHeading>Company</ColumnHeading>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><FooterLink href={routes.home}>Overview</FooterLink></li>
            <li><FooterLink href={routes.howItWorks}>How it works</FooterLink></li>
            <li><FooterLink href={routes.providers}>Providers</FooterLink></li>
            {showIndependents ? (
              <li><FooterLink href={routes.professionals}>Independents</FooterLink></li>
            ) : null}
            <li><FooterLink href={routes.dashboard}>Dashboard</FooterLink></li>
          </ul>
        </nav>

        <nav aria-label="Services">
          <ColumnHeading>Services</ColumnHeading>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><FooterLink href={routes.services}>Testing</FooterLink></li>
            <li><FooterLink href={`${routes.services}?category=inspection`}>Inspection</FooterLink></li>
            <li><FooterLink href={`${routes.services}?category=certification`}>Certification</FooterLink></li>
            <li><FooterLink href={`${routes.services}?category=experts-consulting`}>Consulting</FooterLink></li>
          </ul>
        </nav>

        <div>
          <ColumnHeading>Contact</ColumnHeading>
          <ul className="mt-4 space-y-3 text-sm text-white/70">
            <li>
              <a
                href="mailto:info@ticmarketplace.com"
                className="group inline-flex items-center gap-2.5 transition hover:text-white"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 transition group-hover:bg-[#E36F47]/30">
                  <Mail className="h-4 w-4 text-[#F2A98B]" aria-hidden />
                </span>
                info@ticmarketplace.com
              </a>
            </li>
            <li>
              <a
                href="tel:+919990992492"
                className="group inline-flex items-center gap-2.5 transition hover:text-white"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 transition group-hover:bg-[#E36F47]/30">
                  <Phone className="h-4 w-4 text-[#F2A98B]" aria-hidden />
                </span>
                +91 9990992492
              </a>
            </li>
            <li className="inline-flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                <MapPin className="h-4 w-4 text-[#F2A98B]" aria-hidden />
              </span>
              Remote-first
            </li>
          </ul>
        </div>
      </div>

      <div className="relative border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            &copy; {year} {appName}. All rights reserved.
          </p>
          <p>Testing · Inspection · Certification · ESG</p>
        </div>
      </div>
    </footer>
  );
}