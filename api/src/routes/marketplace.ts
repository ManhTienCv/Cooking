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

marketplaceRouter.get('/orders/:id', requireAuth, asyncHandler(async (req, res) => {
  const result = await marketplaceService.getOrderDetail(req.session.userId!, req.params.id);
  res.json({ success: true, ...result });
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
