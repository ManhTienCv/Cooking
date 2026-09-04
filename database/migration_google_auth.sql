-- Migration: Hỗ trợ đăng nhập & đăng ký bằng Google OAuth
-- Bổ sung cột google_id để lưu định danh người dùng từ Google
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(100) UNIQUE;

-- Cho phép password_hash null khi người dùng đăng ký qua tài khoản Google
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
