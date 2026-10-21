"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import { routes } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function HeaderNav() {
  const pathname = usePathname();
  const { activeOrganization } = useOrganizations();
  const dashboardHref =
    activeOrganization?.organizationType === "PROVIDER" ? routes.providerDashboard : routes.dashboard;
  const onDashboard = pathname === routes.dashboard || pathname === routes.providerDashboard;
  const onHowItWorks = pathname === routes.howItWorks;

  const linkClass = (active: boolean) =>
    cn(
      "whitespace-nowrap border-b-2 px-1 py-1 text-sm font-medium transition",
      active ? "border-sky-700 text-sky-800" : "border-transparent text-slate-700 hover:text-sky-700",
    );

  return (
    <nav className="flex flex-1 items-center justify-center gap-6">
      <Link href={dashboardHref} className={linkClass(onDashboard)} aria-current={onDashboard ? "page" : undefined}>
        Dashboard
      </Link>
      <Link href={routes.howItWorks} className={linkClass(onHowItWorks)} aria-current={onHowItWorks ? "page" : undefined}>
        How it works
      </Link>
    </nav>
  );
}
