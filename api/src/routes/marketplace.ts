import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireSeller } from '../middleware/requireSeller.js';
import { requireCsrf } from '../middleware/csrf.js';
import { requireSellerOtp, requireSellerStepUp } from '../middleware/requireSellerSecurity.js';
import {
  orderCreateRateLimit,
  reviewCreateRateLimit,
  sellerOtpRateLimit,
  sellerProductRateLimit,
  sellerSecurityRateLimit,
} from '../middleware/rateLimits.js';
import * as marketplaceService from '../services/marketplaceService.js';
import * as sellerSettingsService from '../services/sellerSettingsService.js';
import * as sellerSecurityService from '../services/sellerSecurityService.js';
import * as logisticsService from '../services/logisticsService.js';
import * as ghnService from '../services/ghnService.js';
import * as momoService from '../services/momoService.js';
import { pool } from '../db/pool.js';
import { httpError } from '../lib/httpError.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const marketplaceRouter = Router();

/* ================================================================
 * Public: Products
 * ================================================================ */

// GET /api/marketplace/products — search & browse
marketplaceRouter.get('/products', asyncHandler(async (req, res) => {
  const result = await marketplaceService.searchProducts({
    q: req.query.q as string,
    category: req.query.category as string,
    type: req.query.type as string,
    limit: req.query.limit as string,
    offset: req.query.offset as string,
    sort: req.query.sort as string,
  });
  res.json({ success: true, ...result });
}));

// GET /api/marketplace/products/featured
marketplaceRouter.get('/products/featured', asyncHandler(async (req, res) => {
  const result = await marketplaceService.getFeaturedProducts(req.query.limit as string);
  res.json({ success: true, ...result });
}));

// GET /api/marketplace/products/:slugOrId — detail
marketplaceRouter.get('/products/:slugOrId', asyncHandler(async (req, res) => {
  const result = await marketplaceService.getProductDetail(req.params.slugOrId);
  res.json({ success: true, ...result });
}));

// GET /api/marketplace/categories
marketplaceRouter.get('/categories', asyncHandler(async (req, res) => {
  const type = req.query.type ? String(req.query.type) : undefined;
  const result = await marketplaceService.getCategories(type);
  res.json({ success: true, ...result });
}));

// GET /api/marketplace/products/:id/reviews
marketplaceRouter.get('/products/:id/reviews', asyncHandler(async (req, res) => {
  const result = await marketplaceService.getReviews(req.params.id, req.query.limit as string, req.query.offset as string);
  res.json({ success: true, ...result });
}));

// GET /api/marketplace/bundles
marketplaceRouter.get('/bundles', asyncHandler(async (req, res) => {
  const result = await marketplaceService.getActiveBundles(req.query.limit as string);
  res.json({ success: true, ...result });
}));

// GET /api/marketplace/bundles/:slug
marketplaceRouter.get('/bundles/:slug', asyncHandler(async (req, res) => {
  const result = await marketplaceService.getBundleDetail(req.params.slug);
  res.json({ success: true, ...result });
}));

/* ================================================================
 * Smart Features (AI-powered)
 * ================================================================ */

// POST /api/marketplace/smart/match-ingredients — tìm sản phẩm khớp nguyên liệu
marketplaceRouter.post('/smart/match-ingredients', asyncHandler(async (req, res) => {
  const result = await marketplaceService.matchRecipeIngredients(req.body?.ingredients);
  res.json({ success: true, ...result });
}));

// GET /api/marketplace/smart/recommend — AI gợi ý sản phẩm (Groq ưu tiên)
marketplaceRouter.get('/smart/recommend', asyncHandler(async (req, res) => {
  const result = await marketplaceService.getAiRecommendations({
    recipe_title: req.query.recipe_title as string,
    ingredients: req.query.ingredients as string,
    context: req.query.context as string,
  });
  res.json({ success: true, ...result });
}));

// GET /api/marketplace/products/:id/related — sản phẩm liên quan
marketplaceRouter.get('/products/:id/related', asyncHandler(async (req, res) => {
  const result = await marketplaceService.getRelatedProducts(req.params.id, req.query.limit as string);
  res.json({ success: true, ...result });
}));

/* ================================================================
 * Auth Required: Cart
 * ================================================================ */

marketplaceRouter.get('/cart', requireAuth, asyncHandler(async (req, res) => {
  const result = await marketplaceService.getCart(req.session.userId!);
  res.json({ success: true, ...result });
}));

marketplaceRouter.post('/cart', requireAuth, asyncHandler(async (req, res) => {
  const result = await marketplaceService.addToCart(req.session.userId!, req.body);
  res.json(result);
}));

marketplaceRouter.put('/cart/:id', requireAuth, asyncHandler(async (req, res) => {
  const result = await marketplaceService.updateCartItem(req.session.userId!, req.params.id, req.body);
  res.json(result);
}));

marketplaceRouter.delete('/cart/:id', requireAuth, asyncHandler(async (req, res) => {
  const result = await marketplaceService.removeCartItem(req.session.userId!, req.params.id);
  res.json(result);
}));

marketplaceRouter.delete('/cart', requireAuth, asyncHandler(async (req, res) => {
  const result = await marketplaceService.clearCart(req.session.userId!);
  res.json(result);
}));

/* ================================================================
 * Auth Required: Orders
 * ================================================================ */

marketplaceRouter.post('/orders', requireAuth, orderCreateRateLimit, asyncHandler(async (req, res) => {
  const result = await marketplaceService.createOrder(req.session.userId!, req.body);
  res.json({ success: true, ...result });
}));

marketplaceRouter.get('/orders', requireAuth, asyncHandler(async (req, res) => {
  const result = await marketplaceService.getMyOrders(
    req.session.userId!,
    req.query.limit as string,
    req.query.offset as string,
    req.query.q as string
  );
  res.json({ success: true, ...result });
}));

marketplaceRouter.get('/orders/pending-count', requireAuth, asyncHandler(async (req, res) => {
  const result = await marketplaceService.getPendingOrdersCount(req.session.userId!);
  res.json({ success: true, ...result });
}));

marketplaceRouter.get('/orders/:id', requireAuth, asyncHandler(async (req, res) => {
  const result = await marketplaceService.getOrderDetail(req.session.userId!, req.params.id);
  res.json({ success: true, ...result });
}));

marketplaceRouter.put('/orders/:id/cancel', requireAuth, requireCsrf, asyncHandler(async (req, res) => {
  const result = await marketplaceService.buyerCancelOrder(req.session.userId!, req.params.id, req.body);
  res.json(result);
}));

marketplaceRouter.get('/orders/:id/transit-logs', requireAuth, asyncHandler(async (req, res) => {
  const result = await logisticsService.getTransitLogs(Number(req.params.id), req.session.userId!);
  res.json({ success: true, ...result });
}));

marketplaceRouter.put('/orders/:id/complete', requireAuth, asyncHandler(async (req, res) => {
  const result = await marketplaceService.buyerCompleteOrder(req.session.userId!, req.params.id);
  res.json({ success: true, ...result });
}));

marketplaceRouter.get('/orders/:id/reviews', requireAuth, asyncHandler(async (req, res) => {
  const result = await marketplaceService.getOrderReviews(req.session.userId!, req.params.id);
  res.json({ success: true, ...result });
}));

/* ================================================================
 * Auth Required: Reviews
 * ================================================================ */

marketplaceRouter.post('/reviews', requireAuth, reviewCreateRateLimit, asyncHandler(async (req, res) => {
  const result = await marketplaceService.createReview(req.session.userId!, req.body);
  res.json(result);
}));

/* ================================================================
 * Auth Required: Wishlist
 * ================================================================ */

marketplaceRouter.get('/wishlist', requireAuth, asyncHandler(async (req, res) => {
  const result = await marketplaceService.getWishlist(req.session.userId!);
  res.json({ success: true, ...result });
}));

marketplaceRouter.get('/wishlist/:productId', requireAuth, asyncHandler(async (req, res) => {
  const result = await marketplaceService.isWishlisted(req.session.userId!, req.params.productId);
  res.json({ success: true, ...result });
}));

marketplaceRouter.post('/wishlist/:productId', requireAuth, asyncHandler(async (req, res) => {
  const result = await marketplaceService.toggleWishlist(req.session.userId!, req.params.productId);
  res.json({ success: true, ...result });
}));

/* ================================================================
 * Seller Dashboard
 * ================================================================ */

// Đăng ký seller
marketplaceRouter.post('/seller/register', requireAuth, requireCsrf, asyncHandler(async (req, res) => {
  const result = await marketplaceService.registerSeller(req.session.userId!, req.body);
  res.json(result);
}));

// Lấy seller profile
marketplaceRouter.get('/seller/profile', requireAuth, asyncHandler(async (req, res) => {
  const result = await marketplaceService.getSellerProfile(req.session.userId!);
  res.json({ success: true, ...result });
}));

marketplaceRouter.get('/seller/settings', requireAuth, requireSeller, asyncHandler(async (req, res) => {
  const result = await sellerSettingsService.getSettings(req.session.userId!);
  res.json({
    success: true,
    ...result,
    security: sellerSecurityService.getSellerSecurityState(req),
  });
}));

marketplaceRouter.post('/seller/security/password', requireAuth, requireSeller, sellerSecurityRateLimit, requireCsrf, asyncHandler(async (req, res) => {
  const result = await sellerSecurityService.verifySellerPassword(req);
  res.json(result);
}));

marketplaceRouter.post('/seller/security/otp/request', requireAuth, requireSeller, requireSellerStepUp, sellerOtpRateLimit, requireCsrf, asyncHandler(async (req, res) => {
  const result = await sellerSecurityService.requestSellerOtp(req);
  res.json(result);
}));

marketplaceRouter.post('/seller/security/otp/verify', requireAuth, requireSeller, requireSellerStepUp, sellerOtpRateLimit, requireCsrf, asyncHandler(async (req, res) => {
  const result = await sellerSecurityService.verifySellerOtp(req);
  res.json(result);
}));

marketplaceRouter.put('/seller/settings/store', requireAuth, requireSeller, requireCsrf, asyncHandler(async (req, res) => {
  const result = await sellerSettingsService.updateStore(req.session.userId!, req.body);
  res.json(result);
}));

marketplaceRouter.put('/seller/settings/preferences', requireAuth, requireSeller, requireCsrf, asyncHandler(async (req, res) => {
  const result = await sellerSettingsService.updatePreferences(req.session.userId!, req.body);
  res.json(result);
}));

marketplaceRouter.put('/seller/settings/verification', requireAuth, requireSeller, requireSellerStepUp, sellerSecurityRateLimit, requireCsrf, asyncHandler(async (req, res) => {
  const result = await sellerSettingsService.submitVerification(req.session.userId!, req.body);
  res.json(result);
}));

marketplaceRouter.post('/seller/payout-accounts', requireAuth, requireSeller, requireSellerStepUp, requireSellerOtp, requireCsrf, asyncHandler(async (req, res) => {
  const result = await sellerSettingsService.createPayoutAccount(req.session.userId!, req.body);
  res.json(result);
}));

marketplaceRouter.put('/seller/payout-accounts/:id/default', requireAuth, requireSeller, requireSellerStepUp, requireSellerOtp, requireCsrf, asyncHandler(async (req, res) => {
  const result = await sellerSettingsService.setDefaultPayoutAccount(req.session.userId!, req.params.id);
  res.json(result);
}));

marketplaceRouter.delete('/seller/payout-accounts/:id', requireAuth, requireSeller, requireSellerStepUp, requireSellerOtp, requireCsrf, asyncHandler(async (req, res) => {
  const result = await sellerSettingsService.deletePayoutAccount(req.session.userId!, req.params.id);
  res.json(result);
}));

// Sản phẩm của seller
marketplaceRouter.get('/seller/products', requireAuth, requireSeller, asyncHandler(async (req, res) => {
  const result = await marketplaceService.getSellerProducts(req.session.userId!, req.query.limit as string, req.query.offset as string);
  res.json({ success: true, ...result });
}));

// Tạo sản phẩm
marketplaceRouter.post('/seller/products', requireAuth, requireSeller, sellerProductRateLimit, requireCsrf, asyncHandler(async (req, res) => {
  const result = await marketplaceService.createProduct(req.session.userId!, req.body);
  res.json({ success: true, ...result });
}));

// Cập nhật sản phẩm
marketplaceRouter.put('/seller/products/:id', requireAuth, requireSeller, requireCsrf, asyncHandler(async (req, res) => {
  const result = await marketplaceService.updateProduct(req.session.userId!, req.params.id, req.body);
  res.json(result);
}));

// Xóa sản phẩm
marketplaceRouter.delete('/seller/products/:id', requireAuth, requireSeller, requireCsrf, asyncHandler(async (req, res) => {
  const result = await marketplaceService.deleteProduct(req.session.userId!, req.params.id);
  res.json(result);
}));

// Đơn hàng seller nhận
marketplaceRouter.get('/seller/orders', requireAuth, requireSeller, asyncHandler(async (req, res) => {
  const result = await marketplaceService.getSellerOrders(req.session.userId!, req.query.limit as string, req.query.offset as string);
  res.json({ success: true, ...result });
}));

// Cập nhật trạng thái đơn hàng (seller)
marketplaceRouter.put('/seller/orders/:id/status', requireAuth, requireSeller, requireCsrf, asyncHandler(async (req, res) => {
  const result = await marketplaceService.updateOrderStatus(req.session.userId!, req.params.id, req.body, false);
  res.json(result);
}));

// Khởi động giao hàng với đơn vị vận chuyển (seller)
marketplaceRouter.post('/seller/orders/:id/shipping', requireAuth, requireSeller, requireCsrf, asyncHandler(async (req, res) => {
  const result = await logisticsService.initializeShipping(Number(req.params.id), req.session.userId!, req.body);
  res.json(result);
}));

// Thêm lịch trình vận chuyển / bưu cục (seller)
marketplaceRouter.post('/seller/orders/:id/transit-logs', requireAuth, requireSeller, requireCsrf, asyncHandler(async (req, res) => {
  const result = await logisticsService.addTransitLog(Number(req.params.id), req.session.userId!, req.body);
  res.json(result);
}));

/* ================================================================
 * MoMo Sandbox Payment Gateway
 * ================================================================ */

// POST /api/marketplace/orders/:id/momo — Tạo liên kết thanh toán MoMo
marketplaceRouter.post('/orders/:id/momo', requireAuth, asyncHandler(async (req, res) => {
  const orderId = Number(req.params.id);
  const userId = req.session.userId!;

  const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
  const order = rows[0];
  if (!order) {
    throw httpError(404, 'Đơn hàng không tồn tại.');
  }
  if (order.buyer_id !== userId) {
    throw httpError(403, 'Bạn không có quyền thanh toán đơn hàng này.');
  }
  if (order.payment_status === 'paid') {
    return res.json({ success: true, message: 'Đơn hàng đã được thanh toán.', paid: true });
  }

  const result = await momoService.createPaymentUrl({
    orderId: order.id,
    amount: Number(order.total_amount),
    orderInfo: `Thanh toan don hang #${order.id} tai Cooking Web`,
  });

  await pool.query('UPDATE orders SET momo_request_id = $1 WHERE id = $2', [result.requestId, order.id]);

  res.json({
    success: true,
    payUrl: result.payUrl,
    qrCodeUrl: result.qrCodeUrl,
    deeplink: result.deeplink,
    orderId: order.id,
  });
}));

// POST /api/marketplace/payment/momo/ipn — Webhook IPN xử lý kết quả MoMo
export async function handleMoMoIpnHandler(req: any, res: any) {
  try {
    const isValid = momoService.verifyIpnSignature(req.body);
    if (!isValid) {
      console.warn('[MoMo IPN] Chữ ký không hợp lệ:', req.body);
      return res.status(400).json({ message: 'Invalid signature' });
    }

    const { orderId, resultCode, amount, transId, requestId } = req.body;
    console.info(`[MoMo IPN] Đơn hàng ${orderId}, ResultCode: ${resultCode}, TransId: ${transId}`);

    if (String(resultCode) === '0') {
      const orderRes = await pool.query<{ total_amount: number }>('SELECT total_amount FROM orders WHERE id = $1', [Number(orderId)]);
      if (orderRes.rows.length > 0) {
        const expectedTotal = Number(orderRes.rows[0].total_amount);
        const paidAmount = Number(amount) || 0;
        if (paidAmount >= expectedTotal) {
          await pool.query(
            `UPDATE orders 
             SET payment_status = 'paid',
                 paid_amount = $1,
                 paid_via = 'momo',
                 status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END,
                 momo_trans_id = $2,
                 momo_request_id = $3,
                 updated_at = NOW()
             WHERE id = $4`,
            [paidAmount, String(transId), String(requestId), Number(orderId)]
          );
        } else {
          console.warn(`[MoMo IPN] Số tiền thanh toán (${paidAmount}) nhỏ hơn tổng đơn hàng (${expectedTotal}) cho đơn #${orderId}!`);
        }
      }
    }
    return res.status(204).send();
  } catch (err) {
    console.error('[MoMo IPN] Lỗi xử lý webhook:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}

marketplaceRouter.post('/payment/momo/ipn', handleMoMoIpnHandler);

/* ================================================================
 * GHN Express Logistics API
 * ================================================================ */

// GET /api/marketplace/shipping/ghn/provinces — Danh sách tỉnh thành
marketplaceRouter.get('/shipping/ghn/provinces', asyncHandler(async (_req, res) => {
  const provinces = await ghnService.getProvinces();
  res.json({ success: true, data: provinces });
}));

// GET /api/marketplace/shipping/ghn/districts/:provinceId — Danh sách quận huyện
marketplaceRouter.get('/shipping/ghn/districts/:provinceId', asyncHandler(async (req, res) => {
  const districts = await ghnService.getDistricts(Number(req.params.provinceId));
  res.json({ success: true, data: districts });
}));

// GET /api/marketplace/shipping/ghn/wards/:districtId — Danh sách phường xã
marketplaceRouter.get('/shipping/ghn/wards/:districtId', asyncHandler(async (req, res) => {
  const wards = await ghnService.getWards(Number(req.params.districtId));
  res.json({ success: true, data: wards });
}));

// POST /api/marketplace/shipping/ghn/fee — Tính phí vận chuyển GHN
marketplaceRouter.post('/shipping/ghn/fee', asyncHandler(async (req, res) => {
  const { to_district_id, to_ward_code, weight, insurance_value } = req.body;
  if (!to_district_id || !to_ward_code) {
    throw httpError(400, 'Thiếu thông tin quận/huyện hoặc phường/xã để tính cước GHN.');
  }
  const fee = await ghnService.calculateShippingFee({
    toDistrictId: Number(to_district_id),
    toWardCode: String(to_ward_code),
    weight: Number(weight) || 500,
    insuranceValue: Number(insurance_value) || 0,
  });
  res.json({ success: true, data: fee });
}));

// POST /api/marketplace/seller/orders/:id/ghn-create — Tạo vận đơn GHN tự động
marketplaceRouter.post('/seller/orders/:id/ghn-create', requireAuth, requireSeller, requireCsrf, asyncHandler(async (req, res) => {
  const orderId = Number(req.params.id);
  const userId = req.session.userId!;

  const { rows: orderRows } = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
  const order = orderRows[0];
  if (!order) {
    throw httpError(404, 'Đơn hàng không tồn tại.');
  }

  const { rows: itemRows } = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [orderId]);
  const sellerIds = itemRows.map((r: any) => Number(r.seller_id));
  if (!sellerIds.includes(userId)) {
    throw httpError(403, 'Bạn không có quyền tạo đơn vận chuyển cho đơn hàng này.');
  }

  if (order.ghn_order_code) {
    return res.json({
      success: true,
      message: 'Đơn hàng đã có mã vận đơn GHN.',
      order_code: order.ghn_order_code,
    });
  }

  const toDistrictId = order.to_district_id || req.body.to_district_id || 1442;
  const toWardCode = order.to_ward_code || req.body.to_ward_code || '20101';

  const ghnResult = await ghnService.createShippingOrder({
    orderId: order.id,
    toName: order.shipping_name,
    toPhone: order.shipping_phone,
    toAddress: order.shipping_address,
    toDistrictId: Number(toDistrictId),
    toWardCode: String(toWardCode),
    codAmount: order.payment_method === 'cod' ? Number(order.total_amount) : 0,
    items: itemRows.map((item: any) => ({
      name: item.product_name,
      quantity: item.quantity,
      price: Number(item.unit_price),
    })),
  });

  const estimatedDelivery = ghnResult.expected_delivery_time
    ? new Date(ghnResult.expected_delivery_time)
    : new Date(Date.now() + 3 * 86400000);

  await pool.query(
    `UPDATE orders
     SET status = 'shipping',
         carrier_name = 'Giao Hàng Nhanh (GHN)',
         tracking_number = $1,
         ghn_order_code = $1,
         estimated_delivery_at = $2,
         updated_at = NOW()
     WHERE id = $3`,
    [ghnResult.order_code, estimatedDelivery, order.id]
  );

  await pool.query(
    `INSERT INTO order_transit_logs (order_id, status, current_location, description)
     VALUES ($1, 'picked_up', 'Bưu cục GHN Tiếp nhận', $2)`,
    [order.id, `Đơn hàng đã được tạo thành công trên hệ thống GHN Express. Mã vận đơn: ${ghnResult.order_code}.`]
  );

  res.json({
    success: true,
    message: 'Tạo vận đơn GHN thành công!',
    order_code: ghnResult.order_code,
    expected_delivery_time: ghnResult.expected_delivery_time,
  });
}));

