-- Add shipping details columns to orders table if they do not exist
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS estimated_delivery_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS actual_delivery_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS carrier_name VARCHAR(50),
  ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS delay_resolution VARCHAR(50) DEFAULT 'none';

-- Create order transit logs tracking table
CREATE TABLE IF NOT EXISTS order_transit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL, -- 'picked_up', 'in_transit', 'arrived_hub', 'out_for_delivery', 'delayed', 'delivered'
    current_location VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    latitude DECIMAL(9, 6),
    longitude DECIMAL(9, 6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index to optimize querying transit logs for a specific order
CREATE INDEX IF NOT EXISTS idx_transit_logs_order_id ON order_transit_logs(order_id);
