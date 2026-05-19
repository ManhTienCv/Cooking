import * as marketplaceRepo from '../repos/marketplaceRepo.js';
import * as aiService from './aiService.js';
import { processImageBase64 } from '../lib/processImage.js';
import type { CreateOrderInput } from '../types/marketplace.js';

/* ================================================================
 * Products
 * ================================================================ */

export async function searchProducts(query: {
  q?: unknown;
  category?: unknown;
  type?: unknown;
  limit?: unknown;
  offset?: unknown;
  sort?: unknown;
}) {
  const search = query.q ? String(query.q).trim() || null : null;
  const category = query.category ? String(query.category).trim() || null : null;
  const productType = query.type ? String(query.type).trim() || null : null;
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 12));
  const offset = Math.max(0, Number(query.offset) || 0);
  const sort = String(query.sort || 'newest');

  const { rows, total } = await marketplaceRepo.searchProducts(
    search, category, productType, limit, offset, sort
  );
  return { products: rows, total, limit, offset };
}

export async function getProductDetail(slugOrId: unknown) {
  const raw = String(slugOrId ?? '').trim();
  if (!raw) throw { status: 400, message: 'Invalid product ID' };

  const isNumeric = /^\d+$/.test(raw);
  const product = isNumeric
    ? await marketplaceRepo.getProductById(Number(raw))
    : await marketplaceRepo.getProductBySlug(raw);

  if (!product) throw { status: 404, message: 'Sản phẩm không tồn tại.' };
  return { product };
}

export async function getFeaturedProducts(limitRaw: unknown) {
  const limit = Math.min(50, Math.max(1, Number(limitRaw) || 8));
  const products = await marketplaceRepo.getFeaturedProducts(limit);
  return { products };
}

export async function getCategories(type?: string) {
  const categories = await marketplaceRepo.getCategories(type);
  return { categories };
}

/* ================================================================
 * Seller
 * ================================================================ */

export async function registerSeller(
  userId: number,
  body: Record<string, unknown>
) {
  const storeName = String(body?.store_name ?? '').trim();
  if (storeName.length < 2) throw { status: 422, message: 'Tên cửa hàng phải có ít nhất 2 ký tự.' };

  const ok = await marketplaceRepo.createSellerProfile(userId, {
    store_name: storeName,
    store_description: String(body?.store_description ?? '').trim() || null,
    phone: String(body?.phone ?? '').trim() || null,
    address: String(body?.address ?? '').trim() || null,
  });
  if (!ok) throw { status: 400, message: 'Không thể tạo hồ sơ người bán.' };
  return { success: true };
}

export async function getSellerProfile(userId: number) {
  const profile = await marketplaceRepo.getSellerProfile(userId);
  let stats = null;
  if (profile) {
    try {
      stats = await marketplaceRepo.getSellerStats(userId);
    } catch (error) {
      console.error('[marketplace] getSellerStats failed', { userId, error });
      stats = null;
    }
  }
  return { profile, stats };
}

export async function getSellerProducts(userId: number, limitRaw: unknown, offsetRaw: unknown) {
  const limit = Math.min(100, Math.max(1, Number(limitRaw) || 20));
  const offset = Math.max(0, Number(offsetRaw) || 0);
  const { rows, total } = await marketplaceRepo.getProductsBySeller(userId, limit, offset);
  return { products: rows, total, limit, offset };
}

export async function createProduct(userId: number, body: Record<string, unknown>) {
  const profile = await marketplaceRepo.getSellerProfile(userId);
  if (!profile) throw { status: 403, message: 'Bạn chưa đăng ký bán hàng.' };
  if (!profile.is_verified) throw { status: 403, message: 'Tài khoản bán hàng của bạn đang chờ quản trị viên xác duyệt. Vui lòng chờ trước khi đăng sản phẩm.' };

  const name = String(body?.name ?? '').trim();
  const price = Number(body?.price ?? 0);

  if (name.length < 2) throw { status: 422, message: 'Tên sản phẩm phải có ít nhất 2 ký tự.' };
  if (price <= 0) throw { status: 422, message: 'Giá sản phẩm phải lớn hơn 0.' };

  const categoryId = Number(body?.category_id ?? 0);
  if (!categoryId) throw { status: 422, message: 'Vui lòng chọn danh mục sản phẩm.' };

  const imageUrl = processImageBase64(String(body?.image_url ?? '').trim() || null);

  const id = await marketplaceRepo.createProduct(userId, {
    name,
    description: String(body?.description ?? '').trim() || null,
    price,
    sale_price: body?.sale_price ? Number(body.sale_price) : null,
    image_url: imageUrl,
    images: Array.isArray(body?.images) ? (body.images as string[]) : [],
    product_type: (['food', 'ingredient', 'equipment'].includes(String(body?.product_type ?? ''))
      ? String(body?.product_type)
      : 'food') as 'food' | 'ingredient' | 'equipment',
    category_id: categoryId,
    specs: (typeof body?.specs === 'object' && body?.specs !== null ? body.specs : {}) as Record<string, string>,
    stock: Math.max(0, Number(body?.stock ?? 0)),
    unit: String(body?.unit ?? 'cái').trim(),
    recipe_id: body?.recipe_id ? Number(body.recipe_id) : null,
  });

  if (!id) throw { status: 400, message: 'Không thể tạo sản phẩm.' };
  return { id, status: 'pending' };
}

export async function updateProduct(userId: number, idRaw: unknown, body: Record<string, unknown>) {
  const id = Number(idRaw);
  if (!id) throw { status: 400, message: 'Invalid product ID' };

  const existing = await marketplaceRepo.getProductById(id);
  if (!existing || existing.seller_id !== userId) {
    throw { status: 403, message: 'Bạn không có quyền chỉnh sửa sản phẩm này.' };
  }

  const profile = await marketplaceRepo.getSellerProfile(userId);
  if (!profile?.is_verified) {
    throw { status: 403, message: 'Tài khoản bán hàng của bạn chưa được xác duyệt hoặc đã bị khóa.' };
  }

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = String(body.name).trim();
  if (body.description !== undefined) data.description = String(body.description).trim() || null;
  if (body.price !== undefined) data.price = Number(body.price);
  if (body.sale_price !== undefined) data.sale_price = body.sale_price ? Number(body.sale_price) : null;
  if (body.image_url !== undefined) data.image_url = processImageBase64(String(body.image_url).trim() || null);
  if (body.images !== undefined) data.images = Array.isArray(body.images) ? body.images : [];
  if (body.category_id !== undefined) data.category_id = Number(body.category_id);
  if (body.specs !== undefined) data.specs = typeof body.specs === 'object' ? body.specs : {};
  if (body.stock !== undefined) data.stock = Math.max(0, Number(body.stock));
  if (body.unit !== undefined) data.unit = String(body.unit).trim();

  const ok = await marketplaceRepo.updateProduct(id, userId, data as Parameters<typeof marketplaceRepo.updateProduct>[2]);
  if (!ok) throw { status: 400, message: 'Không thể cập nhật sản phẩm.' };
  return { success: true };
}

export async function deleteProduct(userId: number, idRaw: unknown) {
  const id = Number(idRaw);
  if (!id) throw { status: 400, message: 'Invalid product ID' };
  const ok = await marketplaceRepo.deleteProduct(id, userId);
  if (!ok) throw { status: 403, message: 'Bạn không có quyền xóa sản phẩm này.' };
  return { success: true };
}

/* ================================================================
 * Cart
 * ================================================================ */

export async function getCart(userId: number) {
  const items = await marketplaceRepo.getCartItems(userId);
  const count = await marketplaceRepo.getCartCount(userId);

  let total = 0;
  for (const item of items) {
    const price = item.product_sale_price ?? item.product_price;
    total += price * item.quantity;
  }

  return { items, count, total };
}

export async function addToCart(userId: number, body: Record<string, unknown>) {
  const productId = Number(body?.product_id ?? 0);
  const quantity = Math.max(1, Number(body?.quantity ?? 1));

  if (!productId) throw { status: 400, message: 'Invalid product ID' };

  const product = await marketplaceRepo.getProductById(productId);
  if (!product) throw { status: 404, message: 'Sản phẩm không tồn tại.' };
  if (!product.is_available || product.status !== 'approved') {
    throw { status: 400, message: 'Sản phẩm hiện không khả dụng.' };
  }
  if (product.seller_id === userId) {
    throw { status: 400, message: 'Bạn không thể mua sản phẩm của chính mình.' };
  }
  if (product.stock < quantity) {
    throw { status: 400, message: `Chỉ còn ${product.stock} sản phẩm trong kho.` };
  }

  const id = await marketplaceRepo.addCartItem(userId, productId, quantity);
  return { id, success: true };
}

export async function updateCartItem(userId: number, itemIdRaw: unknown, body: Record<string, unknown>) {
  const itemId = Number(itemIdRaw);
  const quantity = Math.max(1, Number(body?.quantity ?? 1));
  if (!itemId) throw { status: 400, message: 'Invalid cart item ID' };

  const ok = await marketplaceRepo.updateCartQuantity(userId, itemId, quantity);
  if (!ok) throw { status: 404, message: 'Không tìm thấy mục giỏ hàng.' };
  return { success: true };
}

export async function removeCartItem(userId: number, itemIdRaw: unknown) {
  const itemId = Number(itemIdRaw);
  if (!itemId) throw { status: 400, message: 'Invalid cart item ID' };
  await marketplaceRepo.removeCartItem(userId, itemId);
  return { success: true };
}

export async function clearCart(userId: number) {
  await marketplaceRepo.clearCart(userId);
  return { success: true };
}

/* ================================================================
 * Orders
 * ================================================================ */

export async function createOrder(userId: number, body: Record<string, unknown>) {
  const shippingName = String(body?.shipping_name ?? '').trim();
  const shippingPhone = String(body?.shipping_phone ?? '').trim();
  const shippingAddress = String(body?.shipping_address ?? '').trim();
  const paymentMethod = String(body?.payment_method ?? 'cod').trim();
  const note = String(body?.note ?? '').trim() || null;

  if (!shippingName || !shippingPhone || !shippingAddress) {
    throw { status: 422, message: 'Vui lòng nhập đầy đủ thông tin giao hàng.' };
  }

  // Lấy giỏ hàng
  const cartItems = await marketplaceRepo.getCartItems(userId);
  if (cartItems.length === 0) {
    throw { status: 400, message: 'Giỏ hàng trống.' };
  }
  
  if (cartItems.some(item => item.seller_id === userId)) {
    throw { status: 400, message: 'Bạn không thể mua sản phẩm của chính mình.' };
  }

  // Tính tổng server-side (không trust client)
  let totalAmount = 0;
  const items = cartItems.map((ci) => {
    const unitPrice = ci.product_sale_price ?? ci.product_price;
    const subtotal = unitPrice * ci.quantity;
    totalAmount += subtotal;
    return {
      product_id: ci.product_id,
      seller_id: ci.seller_id,
      product_name: ci.product_name,
      product_image: ci.product_image,
      quantity: ci.quantity,
      unit_price: unitPrice,
      subtotal,
    };
  });

  const orderId = await marketplaceRepo.createOrder(
    userId,
    totalAmount,
    { name: shippingName, phone: shippingPhone, address: shippingAddress, payment_method: paymentMethod, note },
    items
  );

  return { order_id: orderId, total_amount: totalAmount };
}

export async function getMyOrders(userId: number, limitRaw: unknown, offsetRaw: unknown) {
  const limit = Math.min(50, Math.max(1, Number(limitRaw) || 10));
  const offset = Math.max(0, Number(offsetRaw) || 0);
  const { rows, total } = await marketplaceRepo.getOrdersByBuyer(userId, limit, offset);
  return { orders: rows, total, limit, offset };
}

export async function getOrderDetail(userId: number, idRaw: unknown) {
  const id = Number(idRaw);
  if (!id) throw { status: 400, message: 'Invalid order ID' };

  const order = await marketplaceRepo.getOrderById(id);
  if (!order) throw { status: 404, message: 'Đơn hàng không tồn tại.' };
  if (order.buyer_id !== userId) {
    // Kiểm tra nếu user là seller của đơn hàng
    const sellerCheck = order.items.some((i) => i.seller_id === userId);
    if (!sellerCheck) throw { status: 403, message: 'Không có quyền xem đơn hàng này.' };
  }

  return { order };
}

export async function buyerCompleteOrder(userId: number, idRaw: unknown) {
  const id = Number(idRaw);
  if (!id) throw { status: 400, message: 'Invalid order ID' };

  const order = await marketplaceRepo.getOrderById(id);
  if (!order) throw { status: 404, message: 'Đơn hàng không tồn tại.' };
  if (order.buyer_id !== userId) {
    throw { status: 403, message: 'Chỉ người mua mới có quyền xác nhận.' };
  }
  if (order.status !== 'delivered') {
    throw { status: 400, message: 'Chỉ có thể xác nhận hoàn thành khi đơn hàng đã được giao.' };
  }

  await marketplaceRepo.updateOrderStatus(id, 'completed');

  // ── Settlement: chia doanh thu cho từng seller trong đơn hàng ──
  try {
    await settleOrderRevenue(id, order);
  } catch (err) {
    // Log nhưng không rollback trạng thái đơn — settlement có thể retry
    console.error('[settlement] Failed for order #' + id, err instanceof Error ? err.message : err);
  }

  return { message: 'Đã xác nhận hoàn thành đơn hàng.' };
}

/**
 * Tự động chia tiền khi đơn hàng hoàn tất.
 * - Gom subtotal theo từng seller_id
 * - Trừ hoa hồng (commission_rate từ seller_profiles, mặc định 10%)
 * - Cộng phần còn lại vào ví của seller
 * - Ghi 2 dòng wallet_transactions: 1 deposit + 1 fee
 */
async function settleOrderRevenue(
  orderId: number,
  order: { items: Array<{ seller_id: number; subtotal: number }> }
) {
  // Gom doanh thu theo seller
  const sellerTotals = new Map<number, number>();
  for (const item of order.items) {
    sellerTotals.set(item.seller_id, (sellerTotals.get(item.seller_id) ?? 0) + Number(item.subtotal));
  }

  const { pool } = await import('../db/pool.js');

  for (const [sellerId, grossAmount] of sellerTotals) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Lấy commission rate của seller (mặc định 10%)
      const spRes = await client.query(
        'SELECT commission_rate FROM seller_profiles WHERE user_id = $1',
        [sellerId]
      );
      const commissionRate = spRes.rows[0]?.commission_rate ?? 10;
      const feeAmount = Math.round(grossAmount * commissionRate) / 100;
      const netAmount = grossAmount - feeAmount;

      if (netAmount <= 0) {
        await client.query('COMMIT');
        continue;
      }

      // 2. Upsert wallet (tạo nếu chưa có)
      await client.query(
        'INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
        [sellerId]
      );

      // 3. Cộng balance cho seller
      const walletRes = await client.query(
        'UPDATE wallets SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 RETURNING id',
        [netAmount, sellerId]
      );
      const walletId = walletRes.rows[0]?.id;
      if (!walletId) {
        await client.query('ROLLBACK');
        continue;
      }

      // 4. Ghi log deposit (tiền seller nhận)
      await client.query(
        `INSERT INTO wallet_transactions (wallet_id, amount, type, status, reference_id, description)
         VALUES ($1, $2, 'deposit', 'completed', $3, $4)`,
        [walletId, netAmount, 'order-' + orderId, 'Doanh thu đơn hàng #' + orderId]
      );

      // 5. Ghi log fee (hoa hồng nền tảng)
      if (feeAmount > 0) {
        await client.query(
          `INSERT INTO wallet_transactions (wallet_id, amount, type, status, reference_id, description)
           VALUES ($1, $2, 'fee', 'completed', $3, $4)`,
          [walletId, feeAmount, 'fee-order-' + orderId, 'Hoa hồng nền tảng ' + commissionRate + '% đơn #' + orderId]
        );
      }

      await client.query('COMMIT');
      console.info('[settlement] Order #' + orderId + ' → seller ' + sellerId + ': net=' + netAmount + ', fee=' + feeAmount);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

export async function getOrderReviews(userId: number, idRaw: unknown) {
  const id = Number(idRaw);
  if (!id) throw { status: 400, message: 'Invalid order ID' };

  const order = await marketplaceRepo.getOrderById(id);
  if (!order) throw { status: 404, message: 'Đơn hàng không tồn tại.' };
  if (order.buyer_id !== userId) {
    throw { status: 403, message: 'Không có quyền xem đánh giá đơn hàng này.' };
  }

  const reviews = await marketplaceRepo.getOrderReviews(id, userId);
  return { reviews };
}

export async function getSellerOrders(userId: number, limitRaw: unknown, offsetRaw: unknown) {
  const limit = Math.min(50, Math.max(1, Number(limitRaw) || 10));
  const offset = Math.max(0, Number(offsetRaw) || 0);
  const { rows, total } = await marketplaceRepo.getOrdersBySeller(userId, limit, offset);
  return { orders: rows, total, limit, offset };
}

export async function updateOrderStatus(
  userId: number,
  idRaw: unknown,
  body: Record<string, unknown>,
  isAdmin: boolean
) {
  const id = Number(idRaw);
  if (!id) throw { status: 400, message: 'Invalid order ID' };

  const validStatuses = ['confirmed', 'preparing', 'shipping', 'delivered', 'completed', 'cancelled'];
  const status = String(body?.status ?? '').trim();
  if (!validStatuses.includes(status)) throw { status: 422, message: 'Trạng thái không hợp lệ.' };

  const order = await marketplaceRepo.getOrderById(id);
  if (!order) throw { status: 404, message: 'Đơn hàng không tồn tại.' };

  // Quyền: admin hoặc seller sở hữu order
  if (!isAdmin) {
    const isSeller = order.items.some((i) => i.seller_id === userId);
    if (!isSeller) throw { status: 403, message: 'Không có quyền cập nhật đơn hàng này.' };
  }

  const reason = status === 'cancelled' ? String(body?.reason ?? '').trim() || null : undefined;
  const ok = await marketplaceRepo.updateOrderStatus(id, status, reason ?? undefined);
  if (!ok) throw { status: 400, message: 'Không thể cập nhật trạng thái.' };

  // ── Auto-refund khi hủy đơn đã thanh toán bằng CookPay ──
  if (status === 'cancelled') {
    const rawOrder = order as unknown as Record<string, unknown>;
    const paidVia = String(rawOrder.paid_via ?? '');
    const paidAmount = Number(rawOrder.paid_amount ?? 0);
    const paymentStatus = String(rawOrder.payment_status ?? 'unpaid');

    if (paidVia === 'cookpay' && paymentStatus === 'paid' && paidAmount > 0) {
      try {
        const { refundOrder } = await import('./ewalletService.js');
        await refundOrder(id, order.buyer_id, paidAmount);
      } catch (err) {
        console.error('[refund] Auto-refund failed for order #' + id, err instanceof Error ? err.message : err);
      }
    }
  }

  return { success: true };
}

/* ================================================================
 * Reviews
 * ================================================================ */

export async function getReviews(productIdRaw: unknown, limitRaw: unknown, offsetRaw: unknown) {
  const productId = Number(productIdRaw);
  if (!productId) throw { status: 400, message: 'Invalid product ID' };

  const limit = Math.min(50, Math.max(1, Number(limitRaw) || 10));
  const offset = Math.max(0, Number(offsetRaw) || 0);
  const { rows, total } = await marketplaceRepo.getProductReviews(productId, limit, offset);
  return { reviews: rows, total, limit, offset };
}

export async function createReview(userId: number, body: Record<string, unknown>) {
  const productId = Number(body?.product_id ?? 0);
  const orderId = Number(body?.order_id ?? 0);
  const rating = Number(body?.rating ?? 0);
  const comment = String(body?.comment ?? '').trim() || null;

  if (!productId || !orderId) throw { status: 400, message: 'Missing product or order ID.' };
  if (rating < 1 || rating > 5) throw { status: 422, message: 'Rating phải từ 1 đến 5.' };

  // Kiểm tra order thuộc về user và đã delivered/completed
  const order = await marketplaceRepo.getOrderById(orderId);
  if (!order || order.buyer_id !== userId) {
    throw { status: 403, message: 'Đơn hàng không hợp lệ.' };
  }
  if (!['delivered', 'completed'].includes(order.status)) {
    throw { status: 400, message: 'Chỉ có thể đánh giá sau khi nhận hàng.' };
  }

  if (!order.items.some((item) => item.product_id === productId)) {
    throw { status: 403, message: 'Sáº£n pháº©m khÃ´ng thuá»™c Ä‘Æ¡n hÃ ng nÃ y.' };
  }

  const id = await marketplaceRepo.createReview(userId, productId, orderId, rating, comment);
  return { id, success: true };
}

/* ================================================================
 * Wishlist
 * ================================================================ */

export async function getWishlist(userId: number) {
  const items = await marketplaceRepo.getWishlist(userId);
  return { items };
}

export async function toggleWishlist(userId: number, productIdRaw: unknown) {
  const productId = Number(productIdRaw);
  if (!productId) throw { status: 400, message: 'Invalid product ID' };
  const wishlisted = await marketplaceRepo.toggleWishlist(userId, productId);
  return { wishlisted };
}

export async function isWishlisted(userId: number, productIdRaw: unknown) {
  const productId = Number(productIdRaw);
  if (!productId) throw { status: 400, message: 'Invalid product ID' };
  const wishlisted = await marketplaceRepo.isInWishlist(userId, productId);
  return { wishlisted };
}

/* ================================================================
 * Bundles
 * ================================================================ */

export async function getActiveBundles(limitRaw: unknown) {
  const limit = Math.min(20, Math.max(1, Number(limitRaw) || 6));
  const bundles = await marketplaceRepo.getActiveBundles(limit);
  return { bundles };
}

export async function getBundleDetail(slugRaw: unknown) {
  const slug = String(slugRaw ?? '').trim();
  if (!slug) throw { status: 400, message: 'Invalid bundle slug' };
  const bundle = await marketplaceRepo.getBundleBySlug(slug);
  if (!bundle) throw { status: 404, message: 'Gói combo không tồn tại.' };
  return { bundle };
}

/* ================================================================
 * Smart Features
 * ================================================================ */

/**
 * Tìm sản phẩm khớp với nguyên liệu của recipe.
 * Parse chuỗi ingredients → keywords → fuzzy match products trong DB.
 */
export async function matchRecipeIngredients(ingredientsRaw: unknown) {
  const text = String(ingredientsRaw ?? '').trim();
  if (!text) throw { status: 400, message: 'Thiếu danh sách nguyên liệu.' };

  // Parse ingredients text → keywords
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const keywords: string[] = [];

  for (const line of lines) {
    // Remove quantities: "200g thịt bò" → "thịt bò", "2 quả trứng" → "trứng"
    const cleaned = line
      .replace(/^\d+[\s,.]*(g|kg|ml|l|lít|quả|trái|củ|bó|gói|hộp|lon|chai|muỗng|thìa|chén|bát|miếng|lát|cái|con|nhánh|tép)?\s*/i, '')
      .replace(/^\d+\/\d+\s*/, '')
      .trim();

    if (cleaned.length >= 2) {
      keywords.push(cleaned);
    }
  }

  if (keywords.length === 0) return { products: [], keywords: [] };

  const products = await marketplaceRepo.matchProductsByIngredients(keywords, 20);
  return { products, keywords };
}

/**
 * AI-powered product recommendations.
 * Dùng Groq (ưu tiên) để gợi ý sản phẩm phù hợp dựa trên context.
 */
export async function getAiRecommendations(query: {
  recipe_title?: unknown;
  ingredients?: unknown;
  user_history?: unknown;
  context?: unknown;
}) {
  const recipeTitle = String(query.recipe_title ?? '').trim();
  const ingredients = String(query.ingredients ?? '').trim();
  const context = String(query.context ?? 'general').trim();

  // Lấy sản phẩm nổi bật từ DB để cho AI chọn
  const allFeatured = await marketplaceRepo.getFeaturedProducts(50);
  const allProducts = allFeatured.length > 0
    ? allFeatured
    : (await marketplaceRepo.searchProducts(null, null, null, 50, 0, 'popular')).rows;

  if (allProducts.length === 0) {
    return { recommendations: [], source: 'empty_catalog' };
  }

  // Build product catalog cho AI
  const catalog = allProducts.map(p => ({
    id: p.id,
    name: p.name,
    price: p.sale_price ?? p.price,
    type: p.product_type,
    category: p.category_name,
    rating: p.rating,
    sold: p.total_sold,
  }));

  const prompt = `Bạn là trợ lý mua sắm thông minh cho nền tảng nấu ăn CookingBoy.

${recipeTitle ? `Người dùng đang xem công thức: "${recipeTitle}"` : ''}
${ingredients ? `Nguyên liệu cần thiết:\n${ingredients}` : ''}
Context: ${context}

Dưới đây là danh sách sản phẩm có sẵn trong cửa hàng:
${JSON.stringify(catalog, null, 0)}

Hãy chọn 4-8 sản phẩm phù hợp nhất để gợi ý cho người dùng.
Trả về JSON array chứa các product IDs đã chọn, ưu tiên sản phẩm liên quan đến nguyên liệu/công thức.

Response format (JSON only, no explanation):
{"recommended_ids": [1, 2, 3, ...], "reason": "brief explanation in Vietnamese"}`;

  try {
    const aiResult = await aiService.generateContent(prompt, false, 15_000);
    if (aiResult && typeof aiResult === 'object' && 'recommended_ids' in aiResult) {
      const ids = (aiResult as { recommended_ids: number[] }).recommended_ids;
      if (Array.isArray(ids) && ids.length > 0) {
        const validIds = ids.filter(id => typeof id === 'number' && id > 0).slice(0, 10);
        const products = await marketplaceRepo.getProductsByIds(validIds);
        const reason = (aiResult as { reason?: string }).reason ?? '';
        return { recommendations: products, reason, source: 'ai' };
      }
    }
  } catch (err) {
    console.error('[Smart] AI recommendation failed:', err instanceof Error ? err.message : err);
  }

  // Fallback: trả về featured products
  const fallback = allProducts.slice(0, 8);
  return { recommendations: fallback, reason: 'Sản phẩm nổi bật', source: 'fallback' };
}

/**
 * Sản phẩm liên quan (cùng category hoặc cùng seller).
 */
export async function getRelatedProducts(productIdRaw: unknown, limitRaw: unknown) {
  const productId = Number(productIdRaw);
  if (!productId) throw { status: 400, message: 'Invalid product ID' };

  const product = await marketplaceRepo.getProductById(productId);
  if (!product) return { products: [] };

  const limit = Math.min(12, Math.max(1, Number(limitRaw) || 6));

  // Lấy sản phẩm cùng category, loại trừ sản phẩm hiện tại
  const { rows } = await marketplaceRepo.searchProducts(
    null,
    product.category_slug ?? null,
    null,
    limit + 1,
    0,
    'popular'
  );

  const filtered = rows.filter(r => r.id !== productId).slice(0, limit);
  return { products: filtered };
}
