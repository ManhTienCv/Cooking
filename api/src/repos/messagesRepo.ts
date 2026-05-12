import { pool } from '../db/pool.js';
import type { ChatConversation, ChatConversationSummary, ChatMessage, MessageSenderRole } from '../types/messages.js';

export async function getUserById(userId: number): Promise<{ id: number } | null> {
  const { rows } = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
  return (rows[0] as { id: number }) ?? null;
}

export async function getConversationById(id: number): Promise<ChatConversation | null> {
  const { rows } = await pool.query('SELECT * FROM chat_conversations WHERE id = $1', [id]);
  return (rows[0] as ChatConversation) ?? null;
}

export async function getConversationForBuyerSeller(
  buyerId: number,
  sellerId: number,
  productId: number | null
): Promise<ChatConversation | null> {
  if (productId) {
    const { rows } = await pool.query(
      'SELECT * FROM chat_conversations WHERE buyer_id = $1 AND seller_id = $2 AND product_id = $3',
      [buyerId, sellerId, productId]
    );
    return (rows[0] as ChatConversation) ?? null;
  }
  const { rows } = await pool.query(
    'SELECT * FROM chat_conversations WHERE buyer_id = $1 AND seller_id = $2 AND product_id IS NULL',
    [buyerId, sellerId]
  );
  return (rows[0] as ChatConversation) ?? null;
}

export async function createConversation(
  buyerId: number,
  sellerId: number,
  productId: number | null,
  orderId: number | null
): Promise<ChatConversation> {
  const { rows } = await pool.query(
    `INSERT INTO chat_conversations (buyer_id, seller_id, product_id, order_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [buyerId, sellerId, productId, orderId]
  );
  return rows[0] as ChatConversation;
}

export async function listConversationsForUser(userId: number): Promise<ChatConversationSummary[]> {
  const { rows } = await pool.query(
    `SELECT c.*,
        p.name AS product_name,
        p.slug AS product_slug,
        ub.full_name AS buyer_name,
        ub.avatar_url AS buyer_avatar_url,
        us.full_name AS seller_name,
        us.avatar_url AS seller_avatar_url,
        sp.store_name AS seller_store_name,
        lm.message AS last_message,
        lm.sender_id AS last_message_sender_id,
        lm.created_at AS last_message_at,
        (
          SELECT COUNT(*)::int
          FROM chat_messages cm
          WHERE cm.conversation_id = c.id
            AND cm.sender_id <> $1
            AND cm.created_at > COALESCE(
              CASE
                WHEN c.buyer_id = $1 THEN c.buyer_last_read_at
                ELSE c.seller_last_read_at
              END,
              to_timestamp(0)
            )
        ) AS unread_count
     FROM chat_conversations c
     LEFT JOIN products p ON p.id = c.product_id
     JOIN users ub ON ub.id = c.buyer_id
     JOIN users us ON us.id = c.seller_id
     LEFT JOIN seller_profiles sp ON sp.user_id = c.seller_id
     LEFT JOIN LATERAL (
       SELECT message, sender_id, created_at
       FROM chat_messages
       WHERE conversation_id = c.id
       ORDER BY created_at DESC, id DESC
       LIMIT 1
     ) lm ON TRUE
     WHERE c.buyer_id = $1 OR c.seller_id = $1
     ORDER BY COALESCE(lm.created_at, c.updated_at) DESC, c.id DESC`,
    [userId]
  );
  return rows as ChatConversationSummary[];
}

export async function getConversationSummaryById(
  id: number,
  userId: number
): Promise<ChatConversationSummary | null> {
  const { rows } = await pool.query(
    `SELECT c.*,
        p.name AS product_name,
        p.slug AS product_slug,
        ub.full_name AS buyer_name,
        ub.avatar_url AS buyer_avatar_url,
        us.full_name AS seller_name,
        us.avatar_url AS seller_avatar_url,
        sp.store_name AS seller_store_name,
        lm.message AS last_message,
        lm.sender_id AS last_message_sender_id,
        lm.created_at AS last_message_at,
        (
          SELECT COUNT(*)::int
          FROM chat_messages cm
          WHERE cm.conversation_id = c.id
            AND cm.sender_id <> $2
            AND cm.created_at > COALESCE(
              CASE
                WHEN c.buyer_id = $2 THEN c.buyer_last_read_at
                ELSE c.seller_last_read_at
              END,
              to_timestamp(0)
            )
        ) AS unread_count
     FROM chat_conversations c
     LEFT JOIN products p ON p.id = c.product_id
     JOIN users ub ON ub.id = c.buyer_id
     JOIN users us ON us.id = c.seller_id
     LEFT JOIN seller_profiles sp ON sp.user_id = c.seller_id
     LEFT JOIN LATERAL (
       SELECT message, sender_id, created_at
       FROM chat_messages
       WHERE conversation_id = c.id
       ORDER BY created_at DESC, id DESC
       LIMIT 1
     ) lm ON TRUE
     WHERE c.id = $1`,
    [id, userId]
  );
  return (rows[0] as ChatConversationSummary) ?? null;
}

export async function getMessages(
  conversationId: number,
  limit: number,
  offset: number
): Promise<ChatMessage[]> {
  const { rows } = await pool.query(
    `SELECT * FROM chat_messages
     WHERE conversation_id = $1
     ORDER BY created_at ASC, id ASC
     LIMIT $2 OFFSET $3`,
    [conversationId, limit, offset]
  );
  return rows as ChatMessage[];
}

export async function createMessage(
  conversationId: number,
  senderId: number,
  senderRole: MessageSenderRole,
  message: string
): Promise<ChatMessage> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO chat_messages (conversation_id, sender_id, sender_role, message)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [conversationId, senderId, senderRole, message]
    );

    await client.query(
      'UPDATE chat_conversations SET updated_at = NOW() WHERE id = $1',
      [conversationId]
    );

    await client.query('COMMIT');
    return rows[0] as ChatMessage;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function markConversationRead(
  conversationId: number,
  userId: number
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE chat_conversations
     SET buyer_last_read_at = CASE WHEN buyer_id = $2 THEN NOW() ELSE buyer_last_read_at END,
         seller_last_read_at = CASE WHEN seller_id = $2 THEN NOW() ELSE seller_last_read_at END
     WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2)`,
    [conversationId, userId]
  );
  return (rowCount ?? 0) > 0;
}
