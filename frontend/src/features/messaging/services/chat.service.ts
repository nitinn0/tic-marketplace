import { api } from "@/lib/api";

import type { ChatMessage, ConversationDetail, ConversationListItem } from "../types";

export function listConversations() {
  return api.get<{ conversations: ConversationListItem[] }>("/conversations");
}

export function getConversation(id: string) {
  return api.get<{ conversation: ConversationDetail; messages: ChatMessage[] }>(`/conversations/${id}`);
}

export function pollMessages(id: string, after?: string) {
  const query = after ? `?after=${encodeURIComponent(after)}` : "";
  return api.get<{ messages: ChatMessage[] }>(`/conversations/${id}/messages${query}`);
}

export function sendMessage(id: string, body: string) {
  return api.post<ChatMessage>(`/conversations/${id}/messages`, { body });
}

export function markConversationRead(id: string) {
  return api.post<{ ok: boolean }>(`/conversations/${id}/read`, {});
}
