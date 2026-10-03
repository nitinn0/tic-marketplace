import Link from "next/link";

import { appName, routes } from "@/lib/constants";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href={routes.home} className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-700 text-sm font-bold text-white">
            TIC
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Marketplace
            </p>
            <p className="text-lg font-bold text-slate-900">{appName}</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-slate-700 md:flex">
          <Link href={routes.home} className="transition hover:text-sky-700">
            Platform
          </Link>
          <Link href={routes.dashboard} className="transition hover:text-sky-700">
            Dashboard
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" type="button">
            For buyers
          </Button>
          <Button size="sm" type="button">
            For providers
          </Button>
        </div>
      </div>
    </header>
  );
}
