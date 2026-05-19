-- ================================================================
-- Migration: Seller security, verification, settings, payout accounts
-- ================================================================

CREATE TABLE IF NOT EXISTS seller_verification_profiles (
  user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  verification_status VARCHAR(20) NOT NULL DEFAULT 'draft',
  legal_name VARCHAR(160),
  business_type VARCHAR(30) NOT NULL DEFAULT 'individual',
  tax_code VARCHAR(40),
  identity_last4 VARCHAR(4),
  verified_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO seller_verification_profiles (user_id, verification_status, verified_at)
SELECT user_id, CASE WHEN is_verified = TRUE THEN 'verified' ELSE 'draft' END, CASE WHEN is_verified = TRUE THEN updated_at ELSE NULL END
FROM seller_profiles
ON CONFLICT (user_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS seller_settings (
  user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  chat_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  order_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  account_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  marketing_notifications BOOLEAN NOT NULL DEFAULT FALSE,
  profile_visible BOOLEAN NOT NULL DEFAULT TRUE,
  show_phone BOOLEAN NOT NULL DEFAULT FALSE,
  show_address BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seller_payout_accounts (
  id SERIAL PRIMARY KEY,
  seller_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_name VARCHAR(120) NOT NULL,
  account_name VARCHAR(160) NOT NULL,
  account_number_encrypted TEXT NOT NULL,
  account_number_last4 VARCHAR(4) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  verification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_seller_payout_accounts_seller
  ON seller_payout_accounts(seller_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_seller_payout_accounts_default
  ON seller_payout_accounts(seller_id)
  WHERE is_default = TRUE;

CREATE TABLE IF NOT EXISTS seller_security_challenges (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose VARCHAR(40) NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  attempt_count INT NOT NULL DEFAULT 0,
  consumed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_seller_security_challenges_user_purpose
  ON seller_security_challenges(user_id, purpose, created_at DESC);
