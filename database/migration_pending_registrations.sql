-- OTP đăng ký: chạy một lần trên CookingDB (user postgres hoặc tương đương)
CREATE TABLE IF NOT EXISTS pending_registrations (
  email VARCHAR(150) PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pending_registrations_expires ON pending_registrations (expires_at);

-- Cấp quyền cho role app (giống grant_app_user.sql; đổi tên role nếu khác):
-- GRANT SELECT, INSERT, UPDATE, DELETE ON pending_registrations TO "Cooking";
