-- Migration: Ví Cook — payment tracking cho orders
-- Thêm trạng thái thanh toán để hỗ trợ CookPay balance payment + refund

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_via VARCHAR(30) DEFAULT NULL;

-- payment_status: 'unpaid' | 'paid' | 'refunded'
-- paid_via: 'cookpay' | 'momo' | 'cod' | NULL

COMMENT ON COLUMN orders.payment_status IS 'Payment lifecycle: unpaid → paid → refunded (if cancelled)';
COMMENT ON COLUMN orders.paid_amount    IS 'Amount deducted from buyer CookPay wallet at checkout';
COMMENT ON COLUMN orders.paid_via       IS 'Payment channel: cookpay, momo, cod';
