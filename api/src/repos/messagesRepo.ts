import { pool } from '../db/pool.js';
import type { ChatConversation, ChatConversationSummary, ChatMessage, MessageSenderRole } from '../types/messages.js';

export async function getUserById(userId: number): Promise<{ id: number } | null> {
  const { rows } = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
  return (rows[0] as { id: number }) ?? null;
}

export async function isSellerChatEnabled(sellerId: number): Promise<boolean> {
  const { rows } = await pool.query<{ chat_enabled: boolean }>(
    `SELECT COALESCE(ss.chat_enabled, TRUE) AS chat_enabled
     FROM seller_profiles sp
     LEFT JOIN seller_settings ss ON ss.user_id = sp.user_id
     WHERE sp.user_id = $1
     LIMIT 1`,
    [sellerId]
  );
  return rows[0]?.chat_enabled ?? true;
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
      `SELECT * FROM chat_conversations
       WHERE buyer_id = $1 AND seller_id = $2 AND product_id = $3 AND order_id IS NULL`,
      [buyerId, sellerId, productId]
    );
    return (rows[0] as ChatConversation) ?? null;
  }
  const { rows } = await pool.query(
    `SELECT * FROM chat_conversations
     WHERE buyer_id = $1 AND seller_id = $2 AND product_id IS NULL AND order_id IS NULL`,
    [buyerId, sellerId]
  );
  return (rows[0] as ChatConversation) ?? null;
}

export async function getConversationForOrder(
  buyerId: number,
  sellerId: number,
  orderId: number
): Promise<ChatConversation | null> {
  const { rows } = await pool.query(
    `SELECT * FROM chat_conversations
     WHERE buyer_id = $1 AND seller_id = $2 AND order_id = $3`,
    [buyerId, sellerId, orderId]
  );
  return (rows[0] as ChatConversation) ?? null;
}

export async function createConversation(
  buyerId: number,
  sellerId: number,
  productId: number | null,
  orderId: number | null
): Promise<ChatConversation> {
  try {
    const { rows } = await pool.query(
      `INSERT INTO chat_conversations (buyer_id, seller_id, product_id, order_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [buyerId, sellerId, productId, orderId]
    );
    return rows[0] as ChatConversation;
  } catch (err: any) {
    if (err.code === '23505') {
      if (orderId) {
        const { rows } = await pool.query(
          `SELECT * FROM chat_conversations WHERE buyer_id = $1 AND seller_id = $2 AND order_id = $3`,
          [buyerId, sellerId, orderId]
        );
        if (rows.length > 0) return rows[0] as ChatConversation;
      }
      if (productId) {
        const { rows } = await pool.query(
          `SELECT * FROM chat_conversations WHERE buyer_id = $1 AND seller_id = $2 AND product_id = $3 AND order_id IS NULL`,
          [buyerId, sellerId, productId]
        );
        if (rows.length > 0) return rows[0] as ChatConversation;
      } else {
        const { rows } = await pool.query(
          `SELECT * FROM chat_conversations WHERE buyer_id = $1 AND seller_id = $2 AND product_id IS NULL AND order_id IS NULL`,
          [buyerId, sellerId]
        );
        if (rows.length > 0) return rows[0] as ChatConversation;
      }
      const { rows: fallbackRows } = await pool.query(
        `SELECT * FROM chat_conversations 
         WHERE buyer_id = $1 AND seller_id = $2 
         ORDER BY updated_at DESC LIMIT 1`,
        [buyerId, sellerId]
      );
      if (fallbackRows.length > 0) return fallbackRows[0] as ChatConversation;
    }
    throw err;
  }
}

export async function listConversationsForUser(userId: number): Promise<ChatConversationSummary[]> {
  const { rows } = await pool.query(
    `SELECT c.id, c.buyer_id, c.seller_id, c.created_at, c.updated_at,
        c.buyer_last_read_at, c.seller_last_read_at,
        lo.latest_order_id AS order_id,
        lo.latest_order_status AS order_status,
        lo.latest_order_products AS product_name,
        NULL::varchar AS product_slug,
        NULL::int AS product_id,
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
     JOIN users ub ON ub.id = c.buyer_id
     JOIN users us ON us.id = c.seller_id
     LEFT JOIN seller_profiles sp ON sp.user_id = c.seller_id
     LEFT JOIN LATERAL (
       SELECT 
         o.id AS latest_order_id, 
         o.status AS latest_order_status,
         (
           SELECT string_agg(product_name, ', ') 
           FROM order_items 
           WHERE order_id = o.id
         ) AS latest_order_products
       FROM orders o
       WHERE o.buyer_id = c.buyer_id
         AND EXISTS (
           SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.seller_id = c.seller_id
         )
       ORDER BY o.created_at DESC, o.id DESC
       LIMIT 1
     ) lo ON TRUE
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
    `SELECT c.id, c.buyer_id, c.seller_id, c.created_at, c.updated_at,
        c.buyer_last_read_at, c.seller_last_read_at,
        lo.latest_order_id AS order_id,
        lo.latest_order_status AS order_status,
        lo.latest_order_products AS product_name,
        NULL::varchar AS product_slug,
        NULL::int AS product_id,
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
     JOIN users ub ON ub.id = c.buyer_id
     JOIN users us ON us.id = c.seller_id
     LEFT JOIN seller_profiles sp ON sp.user_id = c.seller_id
     LEFT JOIN LATERAL (
       SELECT 
         o.id AS latest_order_id, 
         o.status AS latest_order_status,
         (
           SELECT string_agg(product_name, ', ') 
           FROM order_items 
           WHERE order_id = o.id
         ) AS latest_order_products
       FROM orders o
       WHERE o.buyer_id = c.buyer_id
         AND EXISTS (
           SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.seller_id = c.seller_id
         )
       ORDER BY o.created_at DESC, o.id DESC
       LIMIT 1
     ) lo ON TRUE
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

export async function deleteConversation(id: number): Promise<boolean> {
  const { rowCount } = await pool.query('DELETE FROM chat_conversations WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

