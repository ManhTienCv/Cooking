export type MessageSenderRole = 'buyer' | 'seller';

export interface ChatConversation {
  id: number;
  buyer_id: number;
  seller_id: number;
  product_id: number | null;
  order_id: number | null;
  buyer_last_read_at: Date | null;
  seller_last_read_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ChatConversationSummary extends ChatConversation {
  product_name: string | null;
  product_slug: string | null;
  order_status: string | null;
  buyer_name: string;
  buyer_avatar_url: string | null;
  seller_name: string;
  seller_avatar_url: string | null;
  seller_store_name: string | null;
  last_message: string | null;
  last_message_sender_id: number | null;
  last_message_at: Date | null;
  unread_count: number;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_role: MessageSenderRole;
  message: string;
  created_at: Date;
}
