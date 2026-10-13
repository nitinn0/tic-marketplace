"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  ClipboardList,
  Heart,
  MapPin,
  Package,
  User,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { clearSession, getStoredSession, type SessionUser } from "@/lib/auth";
import { routes } from "@/lib/constants";

const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: routes.dashboard, label: "My Profile", icon: UserRound },
  { href: routes.rfqs, label: "My Orders", icon: ClipboardList },
  { href: routes.rfqs, label: "My RFQ's", icon: Package },
  { href: routes.organizations, label: "My Business Details", icon: Briefcase },
  { href: routes.services, label: "My WishList", icon: Heart },
  { href: routes.organizations, label: "My Address", icon: MapPin },
];

function destination(href: string, signedIn: boolean) {
  if (signedIn) return href;
  return `${routes.login}?next=${encodeURIComponent(href)}`;
}

export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUser(getStoredSession()?.user ?? null);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const signedIn = Boolean(user);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-200"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-500">
          <User className="h-4 w-4" />
        </span>
        {signedIn ? user?.firstName || "Account" : "Login Now"}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-72 rounded-md border border-slate-200 bg-white py-1 text-slate-800 shadow-lg before:absolute before:-top-1.5 before:right-8 before:h-3 before:w-3 before:rotate-45 before:border-l before:border-t before:border-slate-200 before:bg-white"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-sm">
            {signedIn ? (
              <>
                <span className="truncate pr-3 text-slate-600">{user?.email}</span>
                <button
                  type="button"
                  className="shrink-0 font-semibold text-red-600 hover:text-red-700"
                  onClick={() => {
                    clearSession();
                    window.location.href = routes.login;
                  }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <span>New Customer?</span>
                <Link href={routes.register} className="font-semibold text-red-600 hover:text-red-700" onClick={() => setOpen(false)}>
                  Sign-Up
                </Link>
              </>
            )}
          </div>
          {ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={label}
              href={destination(href, signedIn)}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0 hover:bg-slate-50"
            >
              <Icon className="h-4 w-4 text-slate-500" />
              {label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
