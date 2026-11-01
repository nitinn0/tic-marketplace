"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import { routes } from "@/lib/constants";
import { cn } from "@/lib/utils";

/* Palette: Terracotta + Deep Teal
   ink #12303A · text #3E5258 · teal #0F4C5C / #1B7F8C · terracotta #E36F47 · sand #F4EBDD */

export function HeaderNav() {
  const pathname = usePathname() ?? "";
  const { activeOrganization } = useOrganizations();
  const dashboardHref =
    activeOrganization?.organizationType === "PROVIDER" ? routes.providerDashboard : routes.dashboard;

  const matches = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const items = [
    { label: "Services", href: routes.services, active: matches(routes.services) },
    { label: "Providers", href: "/providers", active: matches("/providers") },
    { label: "How it works", href: routes.howItWorks, active: pathname === routes.howItWorks },
    {
      label: "Dashboard",
      href: dashboardHref,
      active: pathname === routes.dashboard || pathname === routes.providerDashboard,
    },
  ];

  return (
    <nav
      aria-label="Primary"
      className="flex flex-1 items-center justify-center gap-0.5 overflow-x-auto sm:gap-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "group relative whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition duration-200",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F4C5C]",
            item.active
              ? "text-[#0F4C5C]"
              : "text-[#3E5258] hover:bg-[#F4EBDD]/70 hover:text-[#0F4C5C]",
          )}
        >
          {item.label}
          <span
            aria-hidden
            className={cn(
              "absolute inset-x-3 bottom-0.5 h-0.5 origin-center rounded-full bg-gradient-to-r from-[#1B7F8C] to-[#E36F47] transition-transform duration-300",
              item.active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-50",
            )}
          />
        </Link>
      ))}
    </nav>
  );
}