-- Migration: VÃ­ Cook â€” payment tracking cho orders
-- ThÃªm tráº¡ng thÃ¡i thanh toÃ¡n Ä‘á»ƒ há»— trá»£ CookPay balance payment + refund

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_via VARCHAR(30) DEFAULT NULL;

-- payment_status: 'unpaid' | 'paid' | 'refunded'
-- paid_via: 'cookpay' | 'momo' | 'cod' | NULL

COMMENT ON COLUMN orders.payment_status IS 'Payment lifecycle: unpaid â†’ paid â†’ refunded (if cancelled)';
COMMENT ON COLUMN orders.paid_amount    IS 'Amount deducted from buyer CookPay wallet at checkout';
COMMENT ON COLUMN orders.paid_via       IS 'Payment channel: cookpay, momo, cod';
