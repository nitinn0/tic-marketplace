"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MessageSquare, Search } from "lucide-react";

import { routes } from "@/lib/constants";
import { cn } from "@/lib/utils";

import type { ConversationListItem } from "../types";
import { ChatAvatar } from "./chat-avatar";

function formatWhen(value: string | null) {
  if (!value) return "";
  try {
    const date = new Date(value);
    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();
    if (sameDay) {
      return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
    }
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
  } catch {
    return "";
  }
}

export function ConversationList({
  conversations,
  activeId,
  compact = false,
  onSelect,
}: {
  conversations: ConversationListItem[];
  activeId?: string | null;
  compact?: boolean;
  onSelect?: (id: string) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return conversations;
    return conversations.filter(
      (row) =>
        row.counterpartName.toLowerCase().includes(needle) ||
        row.rfqTitle.toLowerCase().includes(needle) ||
        row.lastMessage?.body.toLowerCase().includes(needle),
    );
  }, [conversations, query]);

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 py-14 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
          <MessageSquare className="h-6 w-6" aria-hidden />
        </span>
        <p className="mt-4 text-sm font-semibold text-slate-800">No conversations yet</p>
        <p className="mt-1 max-w-[16rem] text-xs leading-5 text-slate-500">
          Chat opens automatically when a buyer awards a quote — both sides can coordinate here safely.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={cn("border-b border-slate-100 bg-white/80 p-3", compact && "p-2.5")}>
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search chats"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white"
          />
        </label>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto">
        {filtered.map((row, index) => {
          const active = row.id === activeId;
          const content = (
            <div className="flex items-start gap-3">
              <ChatAvatar name={row.counterpartName} size={compact ? "sm" : "md"} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={cn(
                      "truncate text-sm",
                      row.unreadCount ? "font-semibold text-slate-900" : "font-medium text-slate-800",
                    )}
                  >
                    {row.counterpartName}
                  </p>
                  <p className="shrink-0 text-[11px] text-slate-400">{formatWhen(row.lastMessageAt ?? row.createdAt)}</p>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-sky-700/80">{row.rfqTitle}</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className={cn("truncate text-sm text-slate-500", row.unreadCount && "font-medium text-slate-700")}>
                    {row.lastMessage?.body ?? "Conversation started — say hello"}
                  </p>
                  {row.unreadCount > 0 ? (
                    <span className="ml-auto inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-sky-700 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {row.unreadCount > 99 ? "99+" : row.unreadCount}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          );

          return (
            <li
              key={row.id}
              className="chat-row-in border-b border-slate-100/80"
              style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
            >
              {onSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect(row.id)}
                  className={cn(
                    "w-full px-3 py-3 text-left transition hover:bg-sky-50/70",
                    active && "bg-sky-50",
                    compact && "px-2.5 py-2.5",
                  )}
                >
                  {content}
                </button>
              ) : (
                <Link
                  href={routes.message(row.id)}
                  className={cn(
                    "block px-4 py-3.5 transition hover:bg-sky-50/70",
                    active && "bg-sky-50",
                    compact && "px-2.5 py-2.5",
                  )}
                >
                  {content}
                </Link>
              )}
            </li>
          );
        })}
        {filtered.length === 0 ? (
          <li className="px-4 py-10 text-center text-sm text-slate-500">No chats match “{query}”.</li>
        ) : null}
      </ul>
    </div>
  );
}
