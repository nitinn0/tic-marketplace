import Link from "next/link";

import { appName, routes } from "@/lib/constants";
import { OrganizationSwitcher } from "@/features/organizations/components/organization-switcher";

import { AccountMenu } from "./account-menu";
import { HeaderNav } from "./header-nav";

export function Header() {
  return (
    <header className="relative z-30 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:gap-6 lg:px-8">
        <Link href={routes.home} className="flex shrink-0 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-700 text-sm font-bold text-white">
            TIC
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Marketplace
            </p>
            <p className="text-lg font-bold text-slate-900">{appName}</p>
          </div>
        </Link>

        <HeaderNav />

        <div className="flex shrink-0 items-center gap-3">
          <OrganizationSwitcher />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
