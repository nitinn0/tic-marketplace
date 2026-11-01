export type ConversationListItem = {
  id: string;
  rfqId: string;
  rfqTitle: string;
  counterpartName: string;
  lastMessage: {
    id: string;
    body: string;
    createdAt: string;
    senderName: string;
  } | null;
  lastMessageAt: string | null;
  unreadCount: number;
  createdAt: string;
};

export type ConversationDetail = {
  id: string;
  rfqId: string;
  rfqTitle: string;
  rfqStatus: string;
  counterpartName: string;
  lastMessageAt: string | null;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  senderUserId: string;
  senderName: string;
};
