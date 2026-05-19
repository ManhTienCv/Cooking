-- =============================================================
-- Social: follows + order-linked chat uniqueness
-- =============================================================

CREATE TABLE IF NOT EXISTS user_follows (
  follower_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_following
  ON user_follows (following_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower
  ON user_follows (follower_id, created_at DESC);

-- One chat thread per buyer + seller + order (post-purchase support)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_chat_conversations_order
  ON chat_conversations (buyer_id, seller_id, order_id)
  WHERE order_id IS NOT NULL;
