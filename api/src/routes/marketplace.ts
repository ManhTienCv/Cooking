import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
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

export const marketplaceRouter = Router();

/* ── Helper: wrap async handlers ───────────────────────── */
function wrap(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

/** Merge success flag vào response, tránh duplicate key khi service đã trả success */
function ok(data: Record<string, unknown>) {
  return { success: true, ...data };
}

/* ================================================================
 * Public: Products
 * ================================================================ */

// GET /api/marketplace/products — search & browse
marketplaceRouter.get('/products', wrap(async (req, res) => {
  const result = await marketplaceService.searchProducts({
    q: req.query.q,
    category: req.query.category,
    type: req.query.type,
    limit: req.query.limit,
    offset: req.query.offset,
    sort: req.query.sort,
  });
  res.json(ok(result));
}));

// GET /api/marketplace/products/featured
marketplaceRouter.get('/products/featured', wrap(async (req, res) => {
  const result = await marketplaceService.getFeaturedProducts(req.query.limit);
  res.json(ok(result));
}));

// GET /api/marketplace/products/:slugOrId — detail
marketplaceRouter.get('/products/:slugOrId', wrap(async (req, res) => {
  const result = await marketplaceService.getProductDetail(req.params.slugOrId);
  res.json(ok(result));
}));

// GET /api/marketplace/categories
marketplaceRouter.get('/categories', wrap(async (req, res) => {
  const type = req.query.type ? String(req.query.type) : undefined;
  const result = await marketplaceService.getCategories(type);
  res.json(ok(result));
}));

// GET /api/marketplace/products/:id/reviews
marketplaceRouter.get('/products/:id/reviews', wrap(async (req, res) => {
  const result = await marketplaceService.getReviews(req.params.id, req.query.limit, req.query.offset);
  res.json(ok(result));
}));

// GET /api/marketplace/bundles
marketplaceRouter.get('/bundles', wrap(async (req, res) => {
  const result = await marketplaceService.getActiveBundles(req.query.limit);
  res.json(ok(result));
}));

// GET /api/marketplace/bundles/:slug
marketplaceRouter.get('/bundles/:slug', wrap(async (req, res) => {
  const result = await marketplaceService.getBundleDetail(req.params.slug);
  res.json(ok(result));
}));

/* ================================================================
 * Smart Features (AI-powered)
 * ================================================================ */

// POST /api/marketplace/smart/match-ingredients — tìm sản phẩm khớp nguyên liệu
marketplaceRouter.post('/smart/match-ingredients', wrap(async (req, res) => {
  const result = await marketplaceService.matchRecipeIngredients(req.body?.ingredients);
  res.json(ok(result));
}));

// GET /api/marketplace/smart/recommend — AI gợi ý sản phẩm (Groq ưu tiên)
marketplaceRouter.get('/smart/recommend', wrap(async (req, res) => {
  const result = await marketplaceService.getAiRecommendations({
    recipe_title: req.query.recipe_title,
    ingredients: req.query.ingredients,
    context: req.query.context,
  });
  res.json(ok(result));
}));

// GET /api/marketplace/products/:id/related — sản phẩm liên quan
marketplaceRouter.get('/products/:id/related', wrap(async (req, res) => {
  const result = await marketplaceService.getRelatedProducts(req.params.id, req.query.limit);
  res.json(ok(result));
}));

/* ================================================================
 * Auth Required: Cart
 * ================================================================ */

marketplaceRouter.get('/cart', requireAuth, wrap(async (req, res) => {
  const result = await marketplaceService.getCart(req.session.userId!);
  res.json(ok(result));
}));

marketplaceRouter.post('/cart', requireAuth, wrap(async (req, res) => {
  const result = await marketplaceService.addToCart(req.session.userId!, req.body);
  res.json(result);
}));

marketplaceRouter.put('/cart/:id', requireAuth, wrap(async (req, res) => {
  const result = await marketplaceService.updateCartItem(req.session.userId!, req.params.id, req.body);
  res.json(result);
}));

marketplaceRouter.delete('/cart/:id', requireAuth, wrap(async (req, res) => {
  const result = await marketplaceService.removeCartItem(req.session.userId!, req.params.id);
  res.json(result);
}));

marketplaceRouter.delete('/cart', requireAuth, wrap(async (req, res) => {
  const result = await marketplaceService.clearCart(req.session.userId!);
  res.json(result);
}));

/* ================================================================
 * Auth Required: Orders
 * ================================================================ */

marketplaceRouter.post('/orders', requireAuth, orderCreateRateLimit, wrap(async (req, res) => {
  const result = await marketplaceService.createOrder(req.session.userId!, req.body);
  res.json(ok(result));
}));

marketplaceRouter.get('/orders', requireAuth, wrap(async (req, res) => {
  const result = await marketplaceService.getMyOrders(req.session.userId!, req.query.limit, req.query.offset);
  res.json(ok(result));
}));

marketplaceRouter.get('/orders/:id', requireAuth, wrap(async (req, res) => {
  const result = await marketplaceService.getOrderDetail(req.session.userId!, req.params.id);
  res.json(ok(result));
}));

marketplaceRouter.put('/orders/:id/complete', requireAuth, wrap(async (req, res) => {
  const result = await marketplaceService.buyerCompleteOrder(req.session.userId!, req.params.id);
  res.json(ok(result));
}));

marketplaceRouter.get('/orders/:id/reviews', requireAuth, wrap(async (req, res) => {
  const result = await marketplaceService.getOrderReviews(req.session.userId!, req.params.id);
  res.json(ok(result));
}));

/* ================================================================
 * Auth Required: Reviews
 * ================================================================ */

marketplaceRouter.post('/reviews', requireAuth, reviewCreateRateLimit, wrap(async (req, res) => {
  const result = await marketplaceService.createReview(req.session.userId!, req.body);
  res.json(result);
}));

/* ================================================================
 * Auth Required: Wishlist
 * ================================================================ */

marketplaceRouter.get('/wishlist', requireAuth, wrap(async (req, res) => {
  const result = await marketplaceService.getWishlist(req.session.userId!);
  res.json(ok(result));
}));

marketplaceRouter.get('/wishlist/:productId', requireAuth, wrap(async (req, res) => {
  const result = await marketplaceService.isWishlisted(req.session.userId!, req.params.productId);
  res.json(ok(result));
}));

marketplaceRouter.post('/wishlist/:productId', requireAuth, wrap(async (req, res) => {
  const result = await marketplaceService.toggleWishlist(req.session.userId!, req.params.productId);
  res.json(ok(result));
}));

/* ================================================================
 * Seller Dashboard
 * ================================================================ */

// Đăng ký seller
marketplaceRouter.post('/seller/register', requireAuth, requireCsrf, wrap(async (req, res) => {
  const result = await marketplaceService.registerSeller(req.session.userId!, req.body);
  res.json(result);
}));

// Lấy seller profile
marketplaceRouter.get('/seller/profile', requireAuth, wrap(async (req, res) => {
  const result = await marketplaceService.getSellerProfile(req.session.userId!);
  res.json(ok(result));
}));

marketplaceRouter.get('/seller/settings', requireAuth, requireSeller, wrap(async (req, res) => {
  const result = await sellerSettingsService.getSettings(req.session.userId!);
  res.json(ok({
    ...result,
    security: sellerSecurityService.getSellerSecurityState(req),
  }));
}));

marketplaceRouter.post('/seller/security/password', requireAuth, requireSeller, sellerSecurityRateLimit, requireCsrf, wrap(async (req, res) => {
  const result = await sellerSecurityService.verifySellerPassword(req);
  res.json(result);
}));

marketplaceRouter.post('/seller/security/otp/request', requireAuth, requireSeller, requireSellerStepUp, sellerOtpRateLimit, requireCsrf, wrap(async (req, res) => {
  const result = await sellerSecurityService.requestSellerOtp(req);
  res.json(result);
}));

marketplaceRouter.post('/seller/security/otp/verify', requireAuth, requireSeller, requireSellerStepUp, sellerOtpRateLimit, requireCsrf, wrap(async (req, res) => {
  const result = await sellerSecurityService.verifySellerOtp(req);
  res.json(result);
}));

marketplaceRouter.put('/seller/settings/store', requireAuth, requireSeller, requireCsrf, wrap(async (req, res) => {
  const result = await sellerSettingsService.updateStore(req.session.userId!, req.body);
  res.json(result);
}));

marketplaceRouter.put('/seller/settings/preferences', requireAuth, requireSeller, requireCsrf, wrap(async (req, res) => {
  const result = await sellerSettingsService.updatePreferences(req.session.userId!, req.body);
  res.json(result);
}));

marketplaceRouter.put('/seller/settings/verification', requireAuth, requireSeller, requireSellerStepUp, sellerSecurityRateLimit, requireCsrf, wrap(async (req, res) => {
  const result = await sellerSettingsService.submitVerification(req.session.userId!, req.body);
  res.json(result);
}));

marketplaceRouter.post('/seller/payout-accounts', requireAuth, requireSeller, requireSellerStepUp, requireSellerOtp, requireCsrf, wrap(async (req, res) => {
  const result = await sellerSettingsService.createPayoutAccount(req.session.userId!, req.body);
  res.json(result);
}));

marketplaceRouter.put('/seller/payout-accounts/:id/default', requireAuth, requireSeller, requireSellerStepUp, requireSellerOtp, requireCsrf, wrap(async (req, res) => {
  const result = await sellerSettingsService.setDefaultPayoutAccount(req.session.userId!, req.params.id);
  res.json(result);
}));

marketplaceRouter.delete('/seller/payout-accounts/:id', requireAuth, requireSeller, requireSellerStepUp, requireSellerOtp, requireCsrf, wrap(async (req, res) => {
  const result = await sellerSettingsService.deletePayoutAccount(req.session.userId!, req.params.id);
  res.json(result);
}));

// Sản phẩm của seller
marketplaceRouter.get('/seller/products', requireAuth, requireSeller, wrap(async (req, res) => {
  const result = await marketplaceService.getSellerProducts(req.session.userId!, req.query.limit, req.query.offset);
  res.json(ok(result));
}));

// Tạo sản phẩm
marketplaceRouter.post('/seller/products', requireAuth, requireSeller, sellerProductRateLimit, requireCsrf, wrap(async (req, res) => {
  const result = await marketplaceService.createProduct(req.session.userId!, req.body);
  res.json(ok(result));
}));

// Cập nhật sản phẩm
marketplaceRouter.put('/seller/products/:id', requireAuth, requireSeller, requireCsrf, wrap(async (req, res) => {
  const result = await marketplaceService.updateProduct(req.session.userId!, req.params.id, req.body);
  res.json(result);
}));

// Xóa sản phẩm
marketplaceRouter.delete('/seller/products/:id', requireAuth, requireSeller, requireCsrf, wrap(async (req, res) => {
  const result = await marketplaceService.deleteProduct(req.session.userId!, req.params.id);
  res.json(result);
}));

// Đơn hàng seller nhận
marketplaceRouter.get('/seller/orders', requireAuth, requireSeller, wrap(async (req, res) => {
  const result = await marketplaceService.getSellerOrders(req.session.userId!, req.query.limit, req.query.offset);
  res.json(ok(result));
}));

// Cập nhật trạng thái đơn hàng (seller)
marketplaceRouter.put('/seller/orders/:id/status', requireAuth, requireSeller, requireCsrf, wrap(async (req, res) => {
  const result = await marketplaceService.updateOrderStatus(req.session.userId!, req.params.id, req.body, false);
  res.json(result);
}));
