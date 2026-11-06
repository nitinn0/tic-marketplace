"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  EllipsisVertical,
  Heart,
  MapPin,
  MessageSquare,
  Package,
  Settings,
  Sparkles,
  User,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import { clearSession, getStoredSession, type SessionUser } from "@/lib/auth";
import { routes } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { MarketplaceNavLinks } from "./marketplace-nav-links";

/* Palette: Terracotta + Deep Teal
   ink #12303A · teal #0F4C5C / #1B7F8C · terracotta #E36F47 / #A8431F · sand #EADFCF · cream #FBF6F0 */

const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: routes.dashboard, label: "My Profile", icon: UserRound },
  { href: routes.accountSettings, label: "Account settings", icon: Settings },
  { href: routes.messages, label: "Messages", icon: MessageSquare },
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

/* Close a popover on outside click or Escape */
function useDismiss(open: boolean, close: () => void, ref: { current: HTMLElement | null }) {
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close, ref]);
}

const MENU_SURFACE =
  "menu-in absolute right-0 z-50 mt-3 rounded-2xl border border-[#EADFCF] bg-white text-[#12303A] shadow-[0_30px_60px_-24px_rgba(18,48,58,0.45)]";

export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { activeOrganization } = useOrganizations();
  const isProvider = activeOrganization?.organizationType === "PROVIDER";

  useEffect(() => {
    setUser(getStoredSession()?.user ?? null);
  }, [pathname]);

  const closeAccount = useCallback(() => setOpen(false), []);
  const closeMore = useCallback(() => setMoreOpen(false), []);
  useDismiss(open, closeAccount, rootRef);
  useDismiss(moreOpen, closeMore, moreRef);

  const signedIn = Boolean(user);
  const initial = (user?.firstName || user?.email || "A").trim().charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-2">
      <div ref={rootRef} className="relative">
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => {
            setMoreOpen(false);
            setOpen((current) => !current);
          }}
          className={cn(
            "inline-flex items-center gap-2 whitespace-nowrap rounded-full py-1.5 pl-1.5 pr-3 text-sm font-semibold transition duration-200",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F4C5C]",
            signedIn
              ? "border border-[#EADFCF] bg-[#FBF6F0] text-[#12303A] shadow-sm hover:border-[#7CC0C8] hover:bg-white"
              : "bg-gradient-to-r from-[#0F4C5C] to-[#1B7F8C] text-white shadow-[0_10px_24px_-12px_rgba(15,76,92,0.9)] hover:-translate-y-0.5",
          )}
        >
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
              signedIn
                ? "bg-gradient-to-br from-[#E36F47] to-[#A9421F] text-white"
                : "bg-white/20 text-white ring-1 ring-white/30",
            )}
          >
            {signedIn ? initial : <User className="h-4 w-4" aria-hidden />}
          </span>
          {signedIn ? user?.firstName || "Account" : "Login Now"}
          <ChevronDown
            className={cn("h-4 w-4 transition duration-200", open && "rotate-180", signedIn ? "text-[#6B7B80]" : "text-white/80")}
            aria-hidden
          />
        </button>

        {open ? (
          <div
            role="menu"
            className={cn(
              MENU_SURFACE,
              "w-80 overflow-hidden before:absolute before:-top-1.5 before:right-9 before:h-3 before:w-3 before:rotate-45 before:border-l before:border-t before:border-[#EADFCF] before:bg-[#FBF6F0]",
            )}
          >
            <div className="relative flex items-center justify-between gap-3 border-b border-[#EADFCF] bg-[#FBF6F0] px-4 py-3.5 text-sm">
              {signedIn ? (
                <>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E36F47] to-[#A9421F] text-sm font-bold text-white">
                      {initial}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[#12303A]">{user?.firstName || "Account"}</p>
                      <p className="truncate text-xs text-[#5A6A6F]">{user?.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-[#A8431F] transition hover:bg-[#FDEEE6]"
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
                  <span className="font-medium text-[#3E5258]">New Customer?</span>
                  <span className="flex items-center gap-3">
                    <Link
                      href={routes.login}
                      className="rounded-full border border-[#0F4C5C] px-3.5 py-1 text-xs font-semibold text-[#0F4C5C] transition hover:bg-[#E8F4F5]"
                      onClick={() => setOpen(false)}
                    >
                      Login
                    </Link>
                    <Link
                      href={routes.register}
                      className="text-xs font-semibold text-[#A8431F] transition hover:text-[#E36F47]"
                      onClick={() => setOpen(false)}
                    >
                      Sign-Up
                    </Link>
                  </span>
                </>
              )}
            </div>

            <div className="p-1.5">
              {ITEMS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={label}
                  href={destination(href, signedIn)}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#3E5258] transition hover:bg-[#E8F4F5] hover:text-[#0F4C5C] focus-visible:bg-[#E8F4F5] focus-visible:outline-none"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F4EBDD] text-[#6B7B80] transition group-hover:bg-white group-hover:text-[#0F4C5C]">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="flex-1">{label}</span>
                  <ChevronRight
                    className="h-4 w-4 -translate-x-1 text-[#E36F47] opacity-0 transition duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                    aria-hidden
                  />
                </Link>
              ))}
            </div>

            {signedIn ? (
              <div className="border-t border-[#EADFCF]">
                <MarketplaceNavLinks menu onNavigate={() => setOpen(false)} />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {isProvider ? null : (
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
          className={cn(
            "inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#EADFCF] bg-white text-[#3E5258] shadow-sm transition duration-200",
            "hover:border-[#7CC0C8] hover:bg-[#E8F4F5] hover:text-[#0F4C5C]",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F4C5C]",
            moreOpen && "border-[#7CC0C8] bg-[#E8F4F5] text-[#0F4C5C]",
          )}
        >
          <EllipsisVertical className="h-5 w-5" aria-hidden />
        </button>
        {moreOpen ? (
          <div role="menu" className={cn(MENU_SURFACE, "w-64 p-1.5")}>
            <Link
              href={routes.join}
              role="menuitem"
              onClick={() => setMoreOpen(false)}
              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-[#FDEEE6] focus-visible:bg-[#FDEEE6] focus-visible:outline-none"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#E36F47] to-[#A9421F] text-white shadow-sm">
                <Sparkles className="h-4 w-4" aria-hidden />
              </span>
              <span className="flex-1">
                <span className="block font-semibold text-[#12303A]">Join as provider</span>

              </span>
              <ChevronRight
                className="h-4 w-4 -translate-x-1 text-[#A8431F] opacity-0 transition duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                aria-hidden
              />
            </Link>
          </div>
        ) : null}
      </div>
      )}
    </div>
  );
}