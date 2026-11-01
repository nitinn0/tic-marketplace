"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, SendHorizontal, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getStoredSession } from "@/lib/auth";
import { routes } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { getConversation, pollMessages, sendMessage } from "../services/chat.service";
import type { ChatMessage, ConversationDetail } from "../types";
import { ChatAvatar } from "./chat-avatar";

function formatTime(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
  } catch {
    return "";
  }
}

function formatDay(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(
      new Date(value),
    );
  } catch {
    return value;
  }
}

export function ChatThread({
  conversationId,
  showBack = false,
  onBack,
}: {
  conversationId: string;
  showBack?: boolean;
  onBack?: () => void;
}) {
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [meId, setMeId] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const latestId = messages[messages.length - 1]?.id;

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  useEffect(() => {
    setMeId(getStoredSession()?.user?.id ?? null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setConversation(null);
    setMessages([]);
    setBannerDismissed(false);
    getConversation(conversationId)
      .then((data) => {
        if (cancelled) return;
        setConversation(data.conversation);
        setMessages(data.messages);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load conversation");
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    if (!conversationId) return;
    const timer = window.setInterval(() => {
      pollMessages(conversationId, latestId)
        .then((data) => {
          if (data.messages.length === 0) return;
          setMessages((current) => {
            const known = new Set(current.map((row) => row.id));
            const next = data.messages.filter((row) => !known.has(row.id));
            return next.length ? [...current, ...next] : current;
          });
        })
        .catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [conversationId, latestId]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = body.trim();
    if (!text || pending) return;
    setPending(true);
    setError(null);
    try {
      const message = await sendMessage(conversationId, text);
      setMessages((current) => (current.some((row) => row.id === message.id) ? current : [...current, message]));
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send message");
    } finally {
      setPending(false);
    }
  }

  if (error && !conversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="text-sm font-medium text-red-700">{error}</p>
        <p className="text-xs text-[#5A6A6F]">Try refreshing, or open the chat again from Messages.</p>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E8F4F5] border-t-[#0F4C5C]" aria-label="Loading" />
      </div>
    );
  }

  let lastDay = "";

  return (
    <div className="flex h-full min-h-0 flex-col bg-[linear-gradient(180deg,#FBF6F0_0%,#F4EBDD_48%,#E8F4F5_100%)]">
      <header className="flex items-center gap-3 border-b border-[#EADFCF] bg-white/90 px-3 py-3 backdrop-blur sm:px-4">
        {showBack ? (
          onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#0F4C5C] transition hover:bg-[#E8F4F5]"
              aria-label="Back to conversations"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <Link
              href={routes.messages}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#0F4C5C] transition hover:bg-[#E8F4F5]"
              aria-label="Back to messages"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )
        ) : null}
        <ChatAvatar name={conversation.counterpartName} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-[#12303A]">{conversation.counterpartName}</p>
          <p className="truncate text-xs text-[#5A6A6F]">
            About{" "}
            <Link href={routes.rfq(conversation.rfqId)} className="font-medium text-[#0F4C5C] hover:text-[#E36F47]">
              {conversation.rfqTitle}
            </Link>
          </p>
        </div>
        <Link
          href={routes.rfq(conversation.rfqId)}
          className="hidden h-9 items-center gap-1.5 rounded-full border border-[#EADFCF] bg-white px-3 text-xs font-semibold text-[#0F4C5C] transition hover:border-[#7CC0C8] hover:bg-[#E8F4F5] sm:inline-flex"
        >
          View RFQ
          <ExternalLink className="h-3 w-3" />
        </Link>
      </header>

      {!bannerDismissed ? (
        <div className="mx-3 mt-3 flex items-start gap-2 rounded-2xl border border-[#E8F4F5] bg-[#E8F4F5]/90 px-3 py-2.5 text-xs text-[#0B3440] shadow-sm sm:mx-4">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0F4C5C]" aria-hidden />
          <p className="flex-1 leading-5">
            Stay on TIC for safety. Phone numbers and email addresses are blocked in chat.
          </p>
          <button
            type="button"
            className="shrink-0 text-[11px] font-semibold text-[#0F4C5C] hover:text-[#E36F47]"
            onClick={() => setBannerDismissed(true)}
          >
            Got it
          </button>
        </div>
      ) : null}

      <div className="chat-thread-scroll min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-4 sm:px-4">
        {messages.length === 0 ? (
          <div className="mx-auto flex max-w-sm flex-col items-center py-12 text-center">
            <ChatAvatar name={conversation.counterpartName} size="lg" />
            <p className="mt-4 text-sm font-semibold text-[#12303A]">Start the conversation</p>
            <p className="mt-1 text-xs leading-5 text-[#5A6A6F]">
              Introduce yourself and align on scope, timeline, or next documents for this award.
            </p>
          </div>
        ) : null}
        {messages.map((message) => {
          const day = formatDay(message.createdAt);
          const showDay = day !== lastDay;
          lastDay = day;
          const mine = meId != null && message.senderUserId === meId;
          return (
            <div key={message.id} className="chat-bubble-in">
              {showDay ? (
                <p className="mb-3 text-center">
                  <span className="inline-flex rounded-full bg-white/80 px-3 py-1 text-[11px] font-medium text-[#5A6A6F] shadow-sm ring-1 ring-[#EADFCF]">
                    {day}
                  </span>
                </p>
              ) : null}
              <div className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start")}>
                {!mine ? <ChatAvatar name={message.senderName} size="sm" className="mb-0.5" /> : null}
                <div
                  className={cn(
                    "max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm sm:max-w-[70%]",
                    mine
                      ? "rounded-br-md bg-gradient-to-br from-[#0F4C5C] to-[#0B3440] text-white"
                      : "rounded-bl-md border border-[#EADFCF] bg-white text-[#12303A]",
                  )}
                >
                  {!mine ? <p className="mb-0.5 text-[11px] font-semibold text-[#5A6A6F]">{message.senderName}</p> : null}
                  <p className="whitespace-pre-wrap break-words leading-5">{message.body}</p>
                  <p className={cn("mt-1.5 text-right text-[10px]", mine ? "text-white/70" : "text-[#6B7B80]")}>
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(event) => void onSubmit(event)}
        className="border-t border-[#EADFCF] bg-white/95 p-3 backdrop-blur sm:p-4"
      >
        {error ? (
          <p className="mb-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
        ) : null}
        <div className="flex items-end gap-2 rounded-2xl border border-[#EADFCF] bg-[#FBF6F0] p-2 shadow-inner focus-within:border-[#7CC0C8] focus-within:bg-white">
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={1}
            maxLength={4000}
            placeholder="Write a message…"
            className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2.5 text-sm outline-none"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            disabled={pending || !body.trim()}
            aria-label="Send message"
            className="h-10 w-10 shrink-0 rounded-xl bg-[#E36F47] text-[#0B2530] hover:bg-[#F2A98B]"
          >
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-center text-[11px] text-[#6B7B80]">Enter to send · Shift+Enter for a new line</p>
      </form>
    </div>
  );
}
