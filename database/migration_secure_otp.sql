-- Harden OTP flows: 5-minute codes, bounded attempts, and resend tracking.
-- Run once against the application database before deploying the updated API.

ALTER TABLE pending_registrations
  ADD COLUMN IF NOT EXISTS attempt_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS resend_count INT NOT NULL DEFAULT 1;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS reset_token_attempts INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_pending_registrations_expires
  ON pending_registrations (expires_at);

CREATE INDEX IF NOT EXISTS idx_users_reset_token_expiry
  ON users (reset_token_expiry);
