import { pool } from '../db/pool.js';
import { httpError } from '../lib/httpError.js';

export interface TransitLogPayload {
  status: 'picked_up' | 'in_transit' | 'arrived_hub' | 'out_for_delivery' | 'delayed' | 'delivered';
  current_location: string;
  description: string;
  latitude?: number;
  longitude?: number;
}

/** Check if user has access to order (buyer or seller) */
async function verifyOrderAccess(client: any, orderId: number, userId: number): Promise<{ isBuyer: boolean; isSeller: boolean; order: any }> {
  const orderRes = await client.query(
    `SELECT *, NOT EXISTS (
       SELECT 1 FROM order_items oi 
       JOIN products p ON oi.product_id = p.id 
       JOIN product_categories pc ON p.category_id = pc.id 
       WHERE oi.order_id = orders.id AND pc.slug != 'do-an-san'
     ) AS is_fast_food_only FROM orders WHERE id = $1`,
    [orderId]
  );
  const order = orderRes.rows[0];
  if (!order) {
    throw httpError(404, 'Đơn hàng không tồn tại.');
  }

  const itemsRes = await client.query('SELECT DISTINCT seller_id FROM order_items WHERE order_id = $1', [orderId]);
  const sellerIds = itemsRes.rows.map((r: any) => Number(r.seller_id));

  const isBuyer = order.buyer_id === userId;
  const isSeller = sellerIds.includes(userId);

  if (!isBuyer && !isSeller) {
    throw httpError(403, 'Không có quyền truy cập thông tin đơn hàng này.');
  }

  return { isBuyer, isSeller, order };
}

/** Get transit logs and delivery details of an order */
export async function getTransitLogs(orderId: number, userId: number) {
  const client = await pool.connect();
  try {
    const { order } = await verifyOrderAccess(client, orderId, userId);

    if (order.is_fast_food_only) {
      return {
        order_id: orderId,
        status: order.status,
        estimated_delivery_at: null,
        actual_delivery_at: order.actual_delivery_at,
        carrier_name: null,
        tracking_number: null,
        delay_resolution: 'none',
        is_delayed: false,
        eligible: false,
        logs: [],
      };
    }

    const logsRes = await client.query(
      'SELECT * FROM order_transit_logs WHERE order_id = $1 ORDER BY created_at DESC',
      [orderId]
    );

    // Auto-check if order is delayed based on CURRENT_TIMESTAMP > estimated_delivery_at
    let isCurrentlyDelayed = order.status === 'delayed';
    if (
      order.status === 'shipping' &&
      order.estimated_delivery_at &&
      new Date() > new Date(order.estimated_delivery_at)
    ) {
      isCurrentlyDelayed = true;
    }

    return {
      order_id: orderId,
      status: order.status,
      estimated_delivery_at: order.estimated_delivery_at,
      actual_delivery_at: order.actual_delivery_at,
      carrier_name: order.carrier_name,
      tracking_number: order.tracking_number,
      delay_resolution: order.delay_resolution,
      is_delayed: isCurrentlyDelayed,
      logs: logsRes.rows,
    };
  } finally {
    client.release();
  }
}

/** Initialize shipping (Set ETA, carrier details, and first picked_up log) */
export async function initializeShipping(
  orderId: number,
  userId: number,
  body: { carrier_name: string; tracking_number: string; estimated_days?: number }
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { isSeller, order } = await verifyOrderAccess(client, orderId, userId);
    if (!isSeller) {
      throw httpError(403, 'Chỉ người bán mới có quyền bắt đầu giao hàng.');
    }
    if (order.is_fast_food_only) {
      throw httpError(400, 'Đơn hàng thức ăn nhanh không áp dụng hình thức vận chuyển đường dài.');
    }

    const estimatedDays = Number(body.estimated_days) || 3;
    const estimatedDeliveryAt = new Date();
    estimatedDeliveryAt.setDate(estimatedDeliveryAt.getDate() + estimatedDays);

    // Update order status to shipping, add carrier details and ETA
    await client.query(
      `UPDATE orders 
       SET status = 'shipping', 
           carrier_name = $1, 
           tracking_number = $2, 
           estimated_delivery_at = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [body.carrier_name, body.tracking_number, estimatedDeliveryAt, orderId]
    );

    // Create first transit log
    await client.query(
      `INSERT INTO order_transit_logs (order_id, status, current_location, description)
       VALUES ($1, 'picked_up', $2, $3)`,
      [
        orderId,
        'Bưu cục Khởi tạo',
        `Đơn hàng đã được bưu tá đơn vị ${body.carrier_name} tiếp nhận thành công. Mã vận đơn: ${body.tracking_number}.`,
      ]
    );

    await client.query('COMMIT');
    return { success: true, message: 'Đã bắt đầu giao hàng và tạo mã vận đơn.' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/** Add a transit log entry (Mocking shipping movement) */
export async function addTransitLog(orderId: number, userId: number, payload: TransitLogPayload) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { isSeller, order } = await verifyOrderAccess(client, orderId, userId);
    if (!isSeller) {
      throw httpError(403, 'Chỉ người bán mới có quyền cập nhật lộ trình.');
    }
    if (order.is_fast_food_only) {
      throw httpError(400, 'Đơn hàng thức ăn nhanh không áp dụng hình thức vận chuyển đường dài.');
    }

    // Insert log
    await client.query(
      `INSERT INTO order_transit_logs (order_id, status, current_location, description, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        orderId,
        payload.status,
        payload.current_location,
        payload.description,
        payload.latitude || null,
        payload.longitude || null,
      ]
    );

    // Check status-specific updates on order
    if (payload.status === 'delivered') {
      await client.query(
        `UPDATE orders 
         SET status = 'delivered', 
             actual_delivery_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [orderId]
      );
    } else if (payload.status === 'delayed') {
      await client.query(
        `UPDATE orders 
         SET status = 'delayed', 
             updated_at = NOW()
         WHERE id = $1`,
        [orderId]
      );

      // Compensate customer if they haven't been compensated already for this order
      if (order.delay_resolution === 'none') {
        // Mocking resolution: Award user virtual point/gift
        await client.query(
          `UPDATE orders 
           SET delay_resolution = 'compensation_sent',
               updated_at = NOW()
           WHERE id = $1`,
          [orderId]
        );

        // Add 50,000đ or 50 points into user's wallet / notification simulation
        // (Just updating status here for demo tracking)
      }
    } else {
      // For general in-transit logs, make sure status is 'shipping'
      if (order.status !== 'shipping') {
        await client.query(
          `UPDATE orders SET status = 'shipping', updated_at = NOW() WHERE id = $1`,
          [orderId]
        );
      }
    }

    await client.query('COMMIT');
    return { success: true, message: 'Cập nhật lộ trình thành công.' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
