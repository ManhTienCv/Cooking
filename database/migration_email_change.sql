-- Add pending email change fields for OTP verification.
-- Safe to run multiple times.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS pending_email VARCHAR(150),
  ADD COLUMN IF NOT EXISTS email_otp VARCHAR(6),
  ADD COLUMN IF NOT EXISTS email_otp_expiry TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_users_pending_email ON users (pending_email);
CREATE INDEX IF NOT EXISTS idx_users_email_otp_expiry ON users (email_otp_expiry);
