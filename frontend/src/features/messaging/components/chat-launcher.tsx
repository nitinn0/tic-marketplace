"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MessageCircle, X } from "lucide-react";

import { isAuthenticated } from "@/lib/auth";
import { routes } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { listConversations } from "../services/chat.service";
import type { ConversationListItem } from "../types";
import { ConversationList } from "./conversation-list";

/** Fixed chat bubble for signed-in users. Hidden on the full messages pages. */
export function ChatLauncher() {
  const pathname = usePathname();
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  const onMessagesRoute = pathname === routes.messages || pathname.startsWith(`${routes.messages}/`);
  const unread = conversations.reduce((sum, row) => sum + row.unreadCount, 0);

  const load = useCallback(() => {
    if (!isAuthenticated()) {
      setSignedIn(false);
      setConversations([]);
      setOpen(false);
      return;
    }
    setSignedIn(true);
    setLoading(true);
    listConversations()
      .then((data) => setConversations(data.conversations))
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 20000);
    return () => window.clearInterval(timer);
  }, [load, pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!signedIn || onMessagesRoute) return null;

  return (
    <div ref={root} className="pointer-events-none fixed bottom-5 right-4 z-40 sm:bottom-7 sm:right-7">
      {open ? (
        <div className="chat-launcher-panel pointer-events-auto mb-3 flex h-[min(32rem,70vh)] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-[0_28px_60px_-24px_rgba(15,23,42,0.45)]">
          <div className="flex items-center justify-between bg-gradient-to-r from-sky-700 to-sky-900 px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">Messages</p>
              <p className="text-[11px] text-sky-100">Award chats stay private on TIC</p>
            </div>
            <button
              type="button"
              aria-label="Close chat panel"
              onClick={() => setOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1">
            {loading && conversations.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-sky-200 border-t-sky-700" />
              </div>
            ) : (
              <ConversationList
                conversations={conversations}
                compact
                onSelect={(id) => {
                  setOpen(false);
                  router.push(routes.message(id));
                }}
              />
            )}
          </div>

          <div className="border-t border-slate-100 bg-slate-50 px-3 py-2.5">
            <Link
              href={routes.messages}
              onClick={() => setOpen(false)}
              className="block rounded-xl bg-white px-3 py-2 text-center text-sm font-semibold text-sky-800 ring-1 ring-slate-200 transition hover:bg-sky-50"
            >
              Open full inbox
            </Link>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        aria-label={unread ? `Messages, ${unread} unread` : "Open messages"}
        onClick={() => {
          setOpen((current) => !current);
          if (!open) load();
        }}
        className={cn(
          "pointer-events-auto relative inline-flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_18px_40px_-16px_rgba(14,91,215,0.9)] transition duration-200",
          "bg-gradient-to-br from-sky-600 to-sky-900 hover:-translate-y-0.5 hover:shadow-[0_22px_44px_-14px_rgba(14,91,215,0.95)]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500",
          open && "ring-4 ring-sky-200",
        )}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white ring-2 ring-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>
    </div>
  );
}
