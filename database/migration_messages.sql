-- =============================================================
-- Chat / Messages
-- =============================================================

CREATE TABLE IF NOT EXISTS chat_conversations (
  id SERIAL PRIMARY KEY,
  buyer_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INT REFERENCES products(id) ON DELETE SET NULL,
  order_id INT REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS buyer_last_read_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS seller_last_read_at TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_chat_conversations_product
  ON chat_conversations (buyer_id, seller_id, product_id)
  WHERE product_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_chat_conversations_general
  ON chat_conversations (buyer_id, seller_id)
  WHERE product_id IS NULL;

CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_role VARCHAR(16) NOT NULL CHECK (sender_role IN ('buyer', 'seller')),
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation
  ON chat_messages (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_buyer
  ON chat_conversations (buyer_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_seller
  ON chat_conversations (seller_id, updated_at DESC);
