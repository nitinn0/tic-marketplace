"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { ChatShell } from "@/features/messaging/components/chat-shell";
import { listConversations } from "@/features/messaging/services/chat.service";
import type { ConversationListItem } from "@/features/messaging/types";

export default function MessageThreadPage() {
  const params = useParams<{ id: string }>();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    listConversations()
      .then((data) => {
        setConversations(data.conversations);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not load messages");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 15000);
    return () => window.clearInterval(timer);
  }, [load]);

  return <ChatShell conversations={conversations} activeId={params.id} loading={loading} error={error} />;
}
