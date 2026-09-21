import * as marketplaceRepo from '../repos/marketplaceRepo.js';
import * as aiService from './aiService.js';
import { processImageBase64 } from '../lib/processImage.js';
import type { CreateOrderInput } from '../types/marketplace.js';
import { pool } from '../db/pool.js';

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
  if (!raw) throw { status: 400, message: 'Mã sản phẩm không hợp lệ' };

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
  const variantId = body?.variant_id ? Number(body.variant_id) : undefined;
  const quantity = Math.max(1, Number(body?.quantity ?? 1));

  if (!productId) throw { status: 400, message: 'Mã sản phẩm không hợp lệ' };

  const product = await marketplaceRepo.getProductById(productId);
  if (!product) throw { status: 404, message: 'Sản phẩm không tồn tại.' };
  if (!product.is_available || product.status !== 'approved') {
    throw { status: 400, message: 'Sản phẩm hiện không khả dụng.' };
  }
  if (product.seller_id === userId) {
    throw { status: 400, message: 'Bạn không thể mua sản phẩm của chính mình.' };
  }

  // Kiểm tra tồn kho theo biến thể hoặc theo sản phẩm cha
  if (variantId) {
    const variant = (product.variants || []).find((v) => v.id === variantId);
    if (!variant) throw { status: 400, message: 'Biến thể sản phẩm không tồn tại.' };
    if (variant.stock < quantity) {
      throw { status: 400, message: `Biến thể "${variant.variant_name}" chỉ còn ${variant.stock} sản phẩm trong kho.` };
    }
  } else if (product.stock < quantity) {
    throw { status: 400, message: `Chỉ còn ${product.stock} sản phẩm trong kho.` };
  }

  const id = await marketplaceRepo.addCartItem(userId, productId, quantity, variantId);
  return { id, success: true };
}

export async function updateCartItem(userId: number, itemIdRaw: unknown, body: Record<string, unknown>) {
  const itemId = Number(itemIdRaw);
  const quantity = Math.max(1, Number(body?.quantity ?? 1));
  if (!itemId) throw { status: 400, message: 'Mã mục giỏ hàng không hợp lệ' };

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
  const rawPaymentMethod = String(body?.payment_method ?? 'cod').trim();
  const paymentMethod = ['cod', 'momo', 'bank_transfer'].includes(rawPaymentMethod) ? rawPaymentMethod : 'cod';
  const note = String(body?.note ?? '').trim() || null;

  if (!shippingName || !shippingPhone || !shippingAddress) {
    throw { status: 422, message: 'Vui lòng nhập đầy đủ thông tin giao hàng.' };
  }

  const phoneRegex = /^[0-9]{10}$/;
  if (!phoneRegex.test(shippingPhone)) {
    throw { status: 422, message: 'Số điện thoại nhận hàng phải bao gồm đúng 10 chữ số và không chứa ký tự khác.' };
  }

  // Lấy giỏ hàng
  let cartItems = await marketplaceRepo.getCartItems(userId);
  if (cartItems.length === 0) {
    throw { status: 400, message: 'Giỏ hàng trống.' };
  }

  // Filter selected cart items if provided
  const cartItemIds = Array.isArray(body?.cart_item_ids)
    ? (body.cart_item_ids as unknown[]).map(Number).filter(Boolean)
    : null;

  if (cartItemIds && cartItemIds.length > 0) {
    cartItems = cartItems.filter(item => cartItemIds.includes(item.id));
    if (cartItems.length === 0) {
      throw { status: 400, message: 'Danh sách sản phẩm thanh toán không hợp lệ.' };
    }
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
      variant_id: ci.variant_id ?? null,
      variant_name: ci.variant_name || null,
      seller_id: ci.seller_id,
      product_name: ci.product_name,
      product_image: ci.product_image,
      quantity: ci.quantity,
      unit_price: unitPrice,
      subtotal,
    };
  });

  const deliveryType = String(body?.delivery_type ?? 'standard').trim();
  // Bảo mật: Nếu giao hỏa tốc, server tự áp mức phí (đơn >= 300k miễn phí, < 300k đồng giá 35k) để chống client can thiệp
  const shippingFee = deliveryType === 'instant_1h'
    ? (totalAmount >= 300000 ? 0 : 35000)
    : Math.max(0, Number(body?.shipping_fee) || 0);

  const toDistrictId = body?.to_district_id ? Number(body.to_district_id) : undefined;
  const toWardCode = body?.to_ward_code ? String(body.to_ward_code) : undefined;
  const refRecipeId = body?.ref_recipe_id ? Number(body.ref_recipe_id) : null;
  const finalTotal = totalAmount + shippingFee;

  const orderId = await marketplaceRepo.createOrder(
    userId,
    finalTotal,
    {
      name: shippingName,
      phone: shippingPhone,
      address: shippingAddress,
      payment_method: paymentMethod,
      note,
      shipping_fee: shippingFee,
      to_district_id: toDistrictId,
      to_ward_code: toWardCode,
      delivery_type: deliveryType,
      ref_recipe_id: refRecipeId,
    },
    items,
    cartItemIds
  );

  return { order_id: orderId, total_amount: finalTotal, shipping_fee: shippingFee };
}

export async function runOrderLifecycleJobs(): Promise<void> {
  try {
    // 1. Chỉ tự động xác nhận đơn COD sau 2 phút (chống tự xác nhận nhầm đơn online chưa trả tiền)
    await pool.query(`
      UPDATE orders 
      SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP 
      WHERE status = 'pending' 
        AND payment_method = 'cod'
        AND created_at <= CURRENT_TIMESTAMP - INTERVAL '2 minutes'
    `);

    // 2. Tự động hủy và hoàn kho đơn thanh toán online (MoMo/Bank) chưa thanh toán quá 15 phút
    await marketplaceRepo.cancelAndRestockExpiredOrders(15);
  } catch (err) {
    console.error('[order-lifecycle] Failed to run order lifecycle jobs:', err);
  }
}

export async function getMyOrders(userId: number, limitRaw: unknown, offsetRaw: unknown, q?: string) {
  await runOrderLifecycleJobs();
  const limit = Math.min(50, Math.max(1, Number(limitRaw) || 10));
  const offset = Math.max(0, Number(offsetRaw) || 0);
  const { rows, total } = await marketplaceRepo.getOrdersByBuyer(userId, limit, offset, q);
  return { orders: rows, total, limit, offset };
}

export async function getOrderDetail(userId: number, idRaw: unknown) {
  await runOrderLifecycleJobs();
  const id = Number(idRaw);
  if (!id) throw { status: 400, message: 'Mã đơn hàng không hợp lệ' };

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
  for (const item of (order.items || [])) {
    sellerTotals.set(item.seller_id, (sellerTotals.get(item.seller_id) ?? 0) + Number(item.subtotal));
  }

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

  // ── Affiliate: Thưởng hoa hồng 5% cho tác giả bài viết nếu đơn hàng mua từ công thức ──
  try {
    const orderAffiliate = await pool.query(
      `SELECT o.ref_recipe_id, o.commission_paid, o.buyer_id, r.author_id, r.title AS recipe_title
       FROM orders o
       JOIN recipes r ON r.id = o.ref_recipe_id
       WHERE o.id = $1 AND o.ref_recipe_id IS NOT NULL AND o.commission_paid = false`,
      [orderId]
    );

    if (orderAffiliate.rows.length > 0) {
      const { author_id, buyer_id, recipe_title } = orderAffiliate.rows[0];
      if (author_id && Number(author_id) !== Number(buyer_id)) {
        let totalProductAmount = 0;
        for (const item of (order.items || [])) {
          totalProductAmount += Number(item.subtotal);
        }
        const affiliateCommission = Math.round(totalProductAmount * 0.05);

        if (affiliateCommission > 0) {
          const affClient = await pool.connect();
          try {
            await affClient.query('BEGIN');
            await affClient.query(
              'INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
              [author_id]
            );
            const wRes = await affClient.query(
              'UPDATE wallets SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 RETURNING id',
              [affiliateCommission, author_id]
            );
            const authorWalletId = wRes.rows[0]?.id;
            if (authorWalletId) {
              await affClient.query(
                `INSERT INTO wallet_transactions (wallet_id, amount, type, status, reference_id, description)
                 VALUES ($1, $2, 'deposit', 'completed', $3, $4)`,
                [
                  authorWalletId,
                  affiliateCommission,
                  'affiliate-order-' + orderId,
                  `Hoa hồng tác giả công thức "${recipe_title}" (đơn #${orderId})`,
                ]
              );
              await affClient.query(
                'UPDATE orders SET commission_amount = $1, commission_paid = true WHERE id = $2',
                [affiliateCommission, orderId]
              );
            }
            await affClient.query('COMMIT');
            console.info(`[affiliate] Order #${orderId} credited ${affiliateCommission}đ to author ${author_id}`);
          } catch (affErr) {
            await affClient.query('ROLLBACK');
            console.error('[affiliate] Error crediting author commission:', affErr);
          } finally {
            affClient.release();
          }
        }
      }
    }
  } catch (affGeneralErr) {
    console.error('[affiliate] General error settling affiliate:', affGeneralErr);
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

export async function updateOrderStatus(
  userId: number,
  idRaw: unknown,
  body: Record<string, unknown>,
  isAdmin: boolean
) {
  const id = Number(idRaw);
  if (!id) throw { status: 400, message: 'Invalid order ID' };

  const validStatuses = ['confirmed', 'preparing', 'shipping', 'delivered', 'completed', 'cancelled', 'refund_pending'];
  const status = String(body?.status ?? '').trim();
  if (!validStatuses.includes(status)) throw { status: 422, message: 'Trạng thái không hợp lệ.' };

  const order = await marketplaceRepo.getOrderById(id);
  if (!order) throw { status: 404, message: 'Đơn hàng không tồn tại.' };

  // Quyền: admin
  if (!isAdmin) {
    throw { status: 403, message: 'Chỉ quản trị viên mới có quyền cập nhật đơn hàng.' };
  }

  // 1. Kiểm tra delay khoảng 2 phút trước khi xác nhận đơn
  if (status === 'confirmed') {
    const timeDiffMs = Date.now() - new Date(order.created_at).getTime();
    if (timeDiffMs < 2 * 60 * 1000) {
      const remainingSecs = Math.ceil((2 * 60 * 1000 - timeDiffMs) / 1000);
      throw { status: 400, message: `Đơn hàng vừa đặt. Vui lòng đợi thêm ${remainingSecs} giây để xác nhận.` };
    }
  }

  // 1b. Không cho phép chuẩn bị đơn hàng khi chưa xác nhận
  if (status === 'preparing' && order.status === 'pending') {
    throw { status: 400, message: 'Đơn hàng đang chờ được xác nhận tự động. Vui lòng quay lại sau khi đơn được xác nhận.' };
  }

  // 2. Kiểm tra điều kiện hủy đơn hàng
  if (status === 'cancelled') {
    if (['shipping', 'delivered', 'completed'].includes(order.status)) {
      throw { status: 400, message: 'Đơn hàng không được phép hủy sau khi đã vận chuyển.' };
    }
  }

  const reason = status === 'cancelled' ? String(body?.reason ?? '').trim() || null : undefined;
  const ok = await marketplaceRepo.updateOrderStatus(id, status, reason ?? undefined);
  if (!ok) throw { status: 400, message: 'Không thể cập nhật trạng thái.' };

  // ── Tự động hoàn kho khi hủy đơn ──
  if (status === 'cancelled') {
    await marketplaceRepo.restockOrderItems(id);
  }

  return { success: true };
}

/* ================================================================
 * Reviews
 * ================================================================ */

export async function getReviews(productIdRaw: unknown, limitRaw: unknown, offsetRaw: unknown) {
  const productId = Number(productIdRaw);
  if (!productId) throw { status: 400, message: 'Mã sản phẩm không hợp lệ' };

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

  if (!productId || !orderId) throw { status: 400, message: 'Thiếu mã sản phẩm hoặc mã đơn hàng.' };
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
    throw { status: 403, message: 'Sản phẩm không thuộc đơn hàng này.' };
  }

  const rawImages = Array.isArray(body?.images) ? body.images : [];
  const images = rawImages
    .map((img: unknown) => String(img ?? '').trim())
    .filter((url: string) => url.length > 0 && (url.startsWith('http') || url.startsWith('data:image/')))
    .slice(0, 5);

  const rawVideo = body?.video_url ? String(body.video_url).trim() : '';
  const videoUrl = /^https?:\/\//i.test(rawVideo) ? rawVideo : null;

  const id = await marketplaceRepo.createReview(userId, productId, orderId, rating, comment, images, videoUrl);
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
  if (!productId) throw { status: 400, message: 'Mã sản phẩm không hợp lệ' };
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
  if (!slug) throw { status: 400, message: 'Mã gói combo không hợp lệ' };
  const bundle = await marketplaceRepo.getBundleBySlug(slug);
  if (!bundle) throw { status: 404, message: 'Gói combo không tồn tại.' };
  return { bundle };
}

/* ================================================================
 * Smart Features
 * ================================================================ */

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
  if (!productId) throw { status: 400, message: 'Mã sản phẩm không hợp lệ' };

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

export async function buyerCancelOrder(userId: number, idRaw: unknown, body: Record<string, unknown>) {
  const id = Number(idRaw);
  if (!id) throw { status: 400, message: 'Mã đơn hàng không hợp lệ' };

  const order = await marketplaceRepo.getOrderById(id);
  if (!order) throw { status: 404, message: 'Đơn hàng không tồn tại.' };

  if (order.buyer_id !== userId) {
    throw { status: 403, message: 'Chỉ người mua mới có quyền hủy đơn hàng này.' };
  }

  if (order.status === 'cancelled') {
    throw { status: 400, message: 'Đơn hàng đã được hủy trước đó.' };
  }
  if (order.status === 'refund_pending') {
    throw { status: 400, message: 'Đơn hàng đang chờ quản trị viên xử lý hoàn tiền.' };
  }
  if (order.status === 'completed') {
    throw { status: 400, message: 'Không thể hủy đơn hàng đã hoàn thành.' };
  }

  // Khóa hủy khi đơn hàng đang giao hoặc đã giao
  if (['shipping', 'delivering', 'delivered', 'completed'].includes(order.status)) {
    throw { status: 400, message: 'Đơn hàng đang hoặc đã được vận chuyển, không thể hủy.' };
  }

  const reason = String(body?.reason ?? '').trim() || 'Người mua yêu cầu hủy';

  // Nếu đơn hàng ĐÃ THANH TOÁN THỰC TẾ (payment_status = 'paid' hoặc is_paid = true)
  const isPaid = order.payment_status === 'paid' || order.is_paid === true;
  if (isPaid) {
    const ok = await marketplaceRepo.requestOrderRefund(id, reason);
    if (!ok) throw { status: 400, message: 'Không thể gửi yêu cầu hoàn tiền.' };
    return {
      success: true,
      refund_pending: true,
      message: 'Đơn hàng đã thanh toán. Đã chuyển sang trạng thái Chờ hoàn tiền, KitchenCook sẽ đối soát và hoàn tiền cho bạn.'
    };
  }

  // Đơn chưa thanh toán (COD hoặc MoMo chưa thanh toán): Hủy ngay lập tức và tự động hoàn kho
  const ok = await marketplaceRepo.updateOrderStatus(id, 'cancelled', reason);
  if (!ok) throw { status: 400, message: 'Không thể hủy đơn hàng.' };

  // Tự động hoàn kho sản phẩm cho đơn hàng bị hủy
  await marketplaceRepo.restockOrderItems(id);

  return { success: true, refund_pending: false, message: 'Đã hủy đơn hàng thành công và hoàn trả số lượng vào kho.' };
}

export async function adminConfirmRefund(
  idRaw: unknown,
  payload?: { transactionCode?: string; note?: string }
) {
  const id = Number(idRaw);
  if (!id) throw { status: 400, message: 'Mã đơn hàng không hợp lệ' };
  const order = await marketplaceRepo.getOrderById(id);
  if (!order) throw { status: 404, message: 'Đơn hàng không tồn tại.' };
  if (order.status !== 'refund_pending') {
    throw { status: 400, message: 'Đơn hàng không ở trạng thái chờ hoàn tiền.' };
  }
  const transCode = payload?.transactionCode ? String(payload.transactionCode).trim().slice(0, 100) : null;
  const refundNote = payload?.note ? String(payload.note).trim().slice(0, 500) : null;
  const ok = await marketplaceRepo.confirmOrderRefund(id, transCode, refundNote);
  if (!ok) throw { status: 400, message: 'Xác nhận hoàn tiền thất bại.' };
  return { success: true, message: 'Đã duyệt hoàn tiền thành công và hoàn kho sản phẩm.' };
}

export async function getPendingOrdersCount(userId: number) {
  await runOrderLifecycleJobs();
  const { pool } = await import('../db/pool.js');

  // Đếm đơn hàng đang chờ xác nhận (status = 'pending') của người mua
  const buyerRes = await pool.query(
    "SELECT COUNT(*) AS count FROM orders WHERE buyer_id = $1 AND status = 'pending'",
    [userId]
  );
  const buyerPending = Number(buyerRes.rows[0]?.count ?? 0);

  return {
    pendingCount: buyerPending,
    buyerPending,
    sellerPending: 0
  };
}
