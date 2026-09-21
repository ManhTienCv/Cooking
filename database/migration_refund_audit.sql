-- Migration: Refund Audit Trace (Bổ sung mã giao dịch đối soát và ghi chú hoàn tiền)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS refund_transaction_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS refund_note TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_refund_trans_code ON orders(refund_transaction_code);
