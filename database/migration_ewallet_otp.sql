-- Migration for E-Wallet OTPs

CREATE TABLE IF NOT EXISTS ewallet_otps (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    otp_hash VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL, -- e.g. 'add_bank', 'withdraw'
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    resend_count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
