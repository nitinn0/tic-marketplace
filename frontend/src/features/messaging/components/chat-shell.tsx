"use client";

import { MessageSquareText } from "lucide-react";

import { cn } from "@/lib/utils";

import type { ConversationListItem } from "../types";
import { ChatThread } from "./chat-thread";
import { ConversationList } from "./conversation-list";

/* Palette: Terracotta + Deep Teal
   dark #0B3440 · cream #FBF6F0 · terracotta #E36F47 · peach #F2A98B · ink #12303A · sand #EADFCF */

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
    <div className="bg-[#FBF6F0]">
      <section className="relative overflow-hidden bg-[#0B3440] text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(27,127,140,0.5),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(227,111,71,0.26),_transparent_45%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:36px_36px] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_75%)]"
        />
        <div className="relative mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-3 px-3 py-8 sm:px-6 md:py-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F2A98B]">Inbox</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight md:text-4xl">Messages</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75">
              Private buyer–provider chats after a quote is awarded.
            </p>
          </div>
          {unreadTotal > 0 ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-[#E36F47]" />
              {unreadTotal} unread
            </span>
          ) : null}
        </div>
      </section>

      <div className="mx-auto flex min-h-[calc(100vh-16rem)] max-w-6xl flex-col px-3 py-6 sm:px-6 lg:py-8">
        <div
          className={cn(
            "chat-shell min-h-0 flex-1 overflow-hidden rounded-[1.5rem] border border-[#EADFCF] bg-white shadow-[0_24px_60px_-36px_rgba(18,48,58,0.4)]",
          )}
        >
          {loading ? (
            <div className="flex h-[28rem] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E8F4F5] border-t-[#0F4C5C]" />
            </div>
          ) : error ? (
            <div className="flex h-[28rem] items-center justify-center px-6 text-center text-sm text-red-700">{error}</div>
          ) : (
            <div className="grid h-[min(42rem,calc(100vh-11rem))] lg:grid-cols-[minmax(17rem,0.95fr)_minmax(0,1.35fr)]">
              <aside className={cn("min-h-0 border-[#EADFCF]", activeId ? "hidden lg:block lg:border-r" : "block")}>
                <div className="flex h-11 items-center border-b border-[#EADFCF] bg-[#FBF6F0]/70 px-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5A6A6F]">Conversations</p>
                </div>
                <div className="h-[calc(100%-2.75rem)]">
                  <ConversationList conversations={conversations} activeId={activeId} />
                </div>
              </aside>

              <section className={cn("min-h-0", !activeId && "hidden lg:block")}>
                {activeId ? (
                  <ChatThread conversationId={activeId} showBack />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_top,#E8F4F5,transparent_55%),linear-gradient(180deg,#FBF6F0,#F4EBDD)] px-8 text-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-[#0F4C5C] shadow-sm ring-1 ring-[#EADFCF]">
                      <MessageSquareText className="h-7 w-7" aria-hidden />
                    </span>
                    <div>
                      <p className="font-display text-base font-semibold text-[#12303A]">Pick a conversation</p>
                      <p className="mt-1 max-w-sm text-sm leading-6 text-[#5A6A6F]">
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
    </div>
  );
}
