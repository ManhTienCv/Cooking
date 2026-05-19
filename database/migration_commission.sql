-- Migration: Add commission_rate to seller_profiles
-- Used by the E-Wallet system to automatically deduct platform fee
-- when an order is marked as completed.

-- NOTE: This migration must be run by the table owner (likely 'postgres').
-- If using the app user 'Cooking', the DBA must first run:
--   ALTER TABLE seller_profiles OWNER TO "Cooking";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seller_profiles' AND column_name = 'commission_rate'
  ) THEN
    ALTER TABLE seller_profiles ADD COLUMN commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00;
    RAISE NOTICE 'Added commission_rate column to seller_profiles';
  ELSE
    RAISE NOTICE 'commission_rate column already exists â€” skipping';
  END IF;
END $$;
