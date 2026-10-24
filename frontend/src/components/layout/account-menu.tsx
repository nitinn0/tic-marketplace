"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  ClipboardList,
  EllipsisVertical,
  Heart,
  MapPin,
  Package,
  User,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { clearSession, getStoredSession, type SessionUser } from "@/lib/auth";
import { routes } from "@/lib/constants";

import { MarketplaceNavLinks } from "./marketplace-nav-links";

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
  const [moreOpen, setMoreOpen] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setUser(getStoredSession()?.user ?? null);
  }, [pathname]);

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

  useEffect(() => {
    if (!moreOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [moreOpen]);

  const signedIn = Boolean(user);

  return (
    <div className="flex items-center gap-2">
      {/* {signedIn ? null : (
        <Link
          href={routes.login}
          className="inline-flex items-center rounded-full bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
        >
          Login
        </Link>
      )} */}
      <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => {
          setMoreOpen(false);
          setOpen((current) => !current);
        }}
        className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-200"
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
                    void import("@/lib/api").then(({ logoutRemote }) =>
                      logoutRemote().finally(() => {
                        clearSession();
                        window.location.href = routes.login;
                      }),
                    );
                  }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <span>New Customer?</span>
                <span className="flex items-center gap-3">
                  <Link
                    href={routes.login}
                    className="rounded-full border border-sky-700 px-3 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-50"
                    onClick={() => setOpen(false)}
                  >
                    Login
                  </Link>
                  <Link href={routes.register} className="font-semibold text-red-600 hover:text-red-700" onClick={() => setOpen(false)}>
                    Sign-Up
                  </Link>
                </span>
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
          {signedIn ? <MarketplaceNavLinks menu onNavigate={() => setOpen(false)} /> : null}
        </div>
      ) : null}
      </div>
      <div ref={moreRef} className="relative">
        <button
          type="button"
          aria-label="More"
          aria-expanded={moreOpen}
          aria-haspopup="menu"
          onClick={() => {
            setOpen(false);
            setMoreOpen((current) => !current);
          }}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-100"
        >
          <EllipsisVertical className="h-5 w-5" />
        </button>
        {moreOpen ? (
          <div
            role="menu"
            className="absolute right-0 z-50 mt-2 w-52 rounded-md border border-slate-200 bg-white py-1 text-slate-800 shadow-lg"
          >
            <Link
              href={routes.join}
              role="menuitem"
              onClick={() => setMoreOpen(false)}
              className="block px-4 py-3 text-sm hover:bg-slate-50"
            >
              Join as provider
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
