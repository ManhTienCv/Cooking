-- OTP Ä‘Äƒng kÃ½: cháº¡y má»™t láº§n trÃªn CookingDB (user postgres hoáº·c tÆ°Æ¡ng Ä‘Æ°Æ¡ng)
CREATE TABLE IF NOT EXISTS pending_registrations (
  email VARCHAR(150) PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pending_registrations_expires ON pending_registrations (expires_at);

-- Cáº¥p quyá»n cho role app (giá»‘ng grant_app_user.sql; Ä‘á»•i tÃªn role náº¿u khÃ¡c):
-- GRANT SELECT, INSERT, UPDATE, DELETE ON pending_registrations TO "Cooking";
