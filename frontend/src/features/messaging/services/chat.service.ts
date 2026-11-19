import { ApiError, api } from "@/lib/api";

import type { ChatMessage, ConversationDetail, ConversationListItem } from "../types";

function orgUnavailable(err: unknown) {
  return err instanceof ApiError && (err.status === 400 || err.status === 403 || err.status === 404);
}

export async function listConversations() {
  const [organization, professional] = await Promise.all([
    api.get<{ conversations: ConversationListItem[] }>("/conversations").catch((err: unknown) => {
      if (orgUnavailable(err)) return { conversations: [] as ConversationListItem[] };
      throw err;
    }),
    api.get<{ conversations: ConversationListItem[] }>("/professional/conversations").catch((err: unknown) => {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403 || err.status === 404)) {
        return { conversations: [] as ConversationListItem[] };
      }
      throw err;
    }),
  ]);
  const merged = new Map<string, ConversationListItem>();
  for (const row of [...organization.conversations, ...professional.conversations]) merged.set(row.id, row);
  return { conversations: [...merged.values()] };
}

async function withProfessionalFallback<T>(organization: () => Promise<T>, professional: () => Promise<T>) {
  try {
    return await organization();
  } catch (err) {
    if (!orgUnavailable(err)) throw err;
    return professional();
  }
}

export function getConversation(id: string) {
  return withProfessionalFallback(
    () => api.get<{ conversation: ConversationDetail; messages: ChatMessage[] }>(`/conversations/${id}`),
    () => api.get<{ conversation: ConversationDetail; messages: ChatMessage[] }>(`/professional/conversations/${id}`),
  );
}

export function pollMessages(id: string, after?: string) {
  const query = after ? `?after=${encodeURIComponent(after)}` : "";
  return withProfessionalFallback(
    () => api.get<{ messages: ChatMessage[] }>(`/conversations/${id}/messages${query}`),
    () => api.get<{ messages: ChatMessage[] }>(`/professional/conversations/${id}/messages${query}`),
  );
}

export function sendMessage(id: string, body: string) {
  return withProfessionalFallback(
    () => api.post<ChatMessage>(`/conversations/${id}/messages`, { body }),
    () => api.post<ChatMessage>(`/professional/conversations/${id}/messages`, { body }),
  );
}

export function markConversationRead(id: string) {
  return withProfessionalFallback(
    () => api.post<{ ok: boolean }>(`/conversations/${id}/read`, {}),
    () => api.post<{ ok: boolean }>(`/professional/conversations/${id}/read`, {}),
  );
}

export function openHireConversation(professionalId: string) {
  return api.post<{ id: string; counterpartName: string }>(`/conversations/professionals/${professionalId}`, {});
}
