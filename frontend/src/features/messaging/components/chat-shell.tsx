"use client";

import { MessageSquareText } from "lucide-react";

import { cn } from "@/lib/utils";

import type { ConversationListItem } from "../types";
import { ChatThread } from "./chat-thread";
import { ConversationList } from "./conversation-list";

export function ChatShell({
  conversations,
  activeId,
  loading = false,
  error = null,
}: {
  conversations: ConversationListItem[];
  activeId?: string | null;
  loading?: boolean;
  error?: string | null;
}) {
  const unreadTotal = conversations.reduce((sum, row) => sum + row.unreadCount, 0);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-7.5rem)] max-w-6xl flex-col px-3 py-6 sm:px-6 lg:py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Inbox</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-slate-900">Messages</h1>
          <p className="mt-1 text-sm text-slate-500">
            Private buyer–provider chats after a quote is awarded.
          </p>
        </div>
        {unreadTotal > 0 ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 ring-1 ring-sky-100">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-600" />
            {unreadTotal} unread
          </span>
        ) : null}
      </div>

      <div
        className={cn(
          "chat-shell min-h-0 flex-1 overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white shadow-[0_24px_60px_-36px_rgba(15,23,42,0.35)]",
        )}
      >
        {loading ? (
          <div className="flex h-[28rem] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-200 border-t-sky-700" />
          </div>
        ) : error ? (
          <div className="flex h-[28rem] items-center justify-center px-6 text-center text-sm text-red-700">{error}</div>
        ) : (
          <div className="grid h-[min(42rem,calc(100vh-11rem))] lg:grid-cols-[minmax(17rem,0.95fr)_minmax(0,1.35fr)]">
            <aside className={cn("min-h-0 border-slate-100", activeId ? "hidden lg:block lg:border-r" : "block")}>
              <div className="flex h-11 items-center border-b border-slate-100 px-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Conversations</p>
              </div>
              <div className="h-[calc(100%-2.75rem)]">
                <ConversationList conversations={conversations} activeId={activeId} />
              </div>
            </aside>

            <section className={cn("min-h-0", !activeId && "hidden lg:block")}>
              {activeId ? (
                <ChatThread conversationId={activeId} showBack />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_top,#e8f1ff,transparent_55%),linear-gradient(180deg,#f8fbff,#f8fafc)] px-8 text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-sky-700 shadow-sm ring-1 ring-sky-100">
                    <MessageSquareText className="h-7 w-7" aria-hidden />
                  </span>
                  <div>
                    <p className="text-base font-semibold text-slate-900">Pick a conversation</p>
                    <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
                      Coordinate scope, timelines and next steps without sharing phone numbers or email in chat.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
