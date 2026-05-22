import { pool } from '../db/pool.js';
import type {
  ProductCategory,
  Product,
  ProductWithSeller,
  CartItem,
  Order,
  OrderWithItems,
  OrderItem,
  ProductReview,
  WishlistItem,
  ProductBundle,
  BundleWithItems,
  BundleItem,
  SellerProfile,
  SellerProfileWithUser,
  CreateProductInput,
} from '../types/marketplace.js';

// Chuyển đổi dữ liệu tổng số lượng sang kiểu số hợp lệ
function parseTotal(v: unknown): number {
  return Number(v ?? 0);
}

/* ================================================================
 * Product Categories
 * ================================================================ */

// Lấy danh sách các danh mục sản phẩm (có thể lọc theo loại)
export async function getCategories(type?: string): Promise<ProductCategory[]> {
  const cond = type ? 'WHERE type = $1' : '';
  const params = type ? [type] : [];
  const { rows } = await pool.query(
    `SELECT * FROM product_categories ${cond} ORDER BY sort_order ASC, name ASC`,
    params
  );
  return rows as ProductCategory[];
}

/* ================================================================
 * Seller Profiles
 * ================================================================ */

// Lấy thông tin hồ sơ bán hàng (Seller Profile) kèm thông tin người dùng
export async function getSellerProfile(userId: number): Promise<SellerProfileWithUser | null> {
  const { rows } = await pool.query(
    `SELECT
       u.id AS user_id,
       COALESCE(sp.store_name, u.full_name) AS store_name,
       sp.store_description,
       sp.phone,
       sp.address,
       COALESCE(sp.is_verified, TRUE) AS is_verified,
       COALESCE(sp.total_sales, 0) AS total_sales,
       COALESCE(sp.rating, 0) AS rating,
       COALESCE(sp.created_at, u.created_at) AS created_at,
       COALESCE(sp.updated_at, u.updated_at, u.created_at) AS updated_at,
       u.full_name,
       u.avatar_url,
       u.email
     FROM users u
     LEFT JOIN seller_profiles sp ON sp.user_id = u.id
     WHERE u.id = $1
       AND sp.user_id IS NOT NULL`,
    [userId]
  );
  return (rows[0] as SellerProfileWithUser) ?? null;
}

// Tính toán các số liệu thống kê của người bán (Doanh thu, Đơn hàng, Tổng sản phẩm)
export async function getSellerStats(userId: number) {
  const prodRes = await pool.query(
    `SELECT COUNT(id) as total_products, COALESCE(SUM(total_sold), 0) as total_sold
     FROM products WHERE seller_id = $1`, [userId]
  );
  const orderRes = await pool.query(
    `SELECT
        COUNT(DISTINCT o.id) AS total_orders,
        COALESCE(SUM(oi.subtotal), 0) AS total_revenue
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE oi.seller_id = $1 AND o.status != 'cancelled'`,
    [userId]
  );
  return {
    total_products: Number(prodRes.rows[0]?.total_products || 0),
    total_sold: Number(prodRes.rows[0]?.total_sold || 0),
    total_orders: Number(orderRes.rows[0]?.total_orders || 0),
    total_revenue: Number(orderRes.rows[0]?.total_revenue || 0)
  };
}

// Tạo hồ sơ người bán hàng mới hoặc cập nhật hồ sơ cũ nếu đã tồn tại
export async function createSellerProfile(
  userId: number,
  data: { store_name: string; store_description: string | null; phone: string | null; address: string | null }
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `INSERT INTO seller_profiles (user_id, store_name, store_description, phone, address)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id) DO UPDATE SET
       store_name = EXCLUDED.store_name,
       store_description = EXCLUDED.store_description,
       phone = EXCLUDED.phone,
       address = EXCLUDED.address,
       updated_at = NOW()`,
    [userId, data.store_name, data.store_description, data.phone, data.address]
  );
  return (rowCount ?? 0) > 0;
}

// Kiểm tra xem một người dùng đã đăng ký tài khoản người bán (Seller) hay chưa
export async function isSeller(userId: number): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1
     FROM users u
     LEFT JOIN seller_profiles sp ON sp.user_id = u.id
     WHERE u.id = $1
       AND sp.user_id IS NOT NULL
     LIMIT 1`,
    [userId]
  );
  return rows.length > 0;
}

// Lấy danh sách sản phẩm công khai của một người bán cụ thể (phân trang)
export async function getPublicProductsBySeller(
  sellerId: number,
  limit: number,
  offset: number
): Promise<{ rows: ProductWithSeller[]; total: number }> {
  const where = "p.seller_id = $1 AND p.status = 'approved' AND p.is_available = TRUE";
  const [dataResult, countResult] = await Promise.all([
    pool.query(
      `SELECT p.*,
          pc.name AS category_name, pc.slug AS category_slug,
          u.full_name AS seller_name, u.avatar_url AS seller_avatar,
          sp.store_name
       FROM products p
       LEFT JOIN product_categories pc ON p.category_id = pc.id
       LEFT JOIN users u ON p.seller_id = u.id
       LEFT JOIN seller_profiles sp ON p.seller_id = sp.user_id
       WHERE ${where}
       ORDER BY p.is_featured DESC, p.total_sold DESC, p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [sellerId, limit, offset]
    ),
    pool.query(`SELECT COUNT(*) AS total FROM products p WHERE ${where}`, [sellerId]),
  ]);
  return {
    rows: dataResult.rows as ProductWithSeller[],
    total: parseTotal(countResult.rows[0]?.total),
  };
}

// Kiểm tra quyền truy cập vào đơn hàng của một người dùng cụ thể (người mua hoặc người bán trong đơn hàng)
export async function userHasOrderAccess(
  orderId: number,
  userId: number
): Promise<{ buyerId: number; sellerIds: number[] } | null> {
  const order = await getOrderById(orderId);
  if (!order) return null;
  const sellerIds = [...new Set(order.items.map((i) => i.seller_id))];
  if (order.buyer_id === userId) return { buyerId: order.buyer_id, sellerIds };
  if (sellerIds.includes(userId)) return { buyerId: order.buyer_id, sellerIds };
  return null;
}

/* ================================================================
 * Products
 * ================================================================ */

// Tìm kiếm sản phẩm nâng cao lọc theo từ khóa, danh mục, loại sản phẩm và sắp xếp kết quả
export async function searchProducts(
  search: string | null,
  category: string | null,
  productType: string | null,
  limit: number,
  offset: number,
  sortBy: string
): Promise<{ rows: ProductWithSeller[]; total: number }> {
  const conditions: string[] = ["p.status = 'approved'", 'p.is_available = TRUE'];
  const params: (string | number)[] = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
  }
  if (category) {
    params.push(category);
    conditions.push(`pc.slug = $${params.length}`);
  }
  if (productType) {
    params.push(productType);
    conditions.push(`p.product_type = $${params.length}`);
  }

  const orderMap: Record<string, string> = {
    newest: 'p.created_at DESC',
    price_asc: 'COALESCE(p.sale_price, p.price) ASC',
    price_desc: 'COALESCE(p.sale_price, p.price) DESC',
    popular: 'p.total_sold DESC',
    rating: 'p.rating DESC',
  };
  const orderSql = orderMap[sortBy] || 'p.created_at DESC';

  const where = conditions.join(' AND ');

  const countSql = `SELECT COUNT(*) AS total
    FROM products p
    LEFT JOIN product_categories pc ON p.category_id = pc.id
    WHERE ${where}`;

  const dataSql = `SELECT p.*,
      pc.name AS category_name, pc.slug AS category_slug,
      u.full_name AS seller_name, u.avatar_url AS seller_avatar,
      sp.store_name
    FROM products p
    LEFT JOIN product_categories pc ON p.category_id = pc.id
    LEFT JOIN users u ON p.seller_id = u.id
    LEFT JOIN seller_profiles sp ON p.seller_id = sp.user_id
    WHERE ${where}
    ORDER BY p.is_featured DESC, ${orderSql}
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

  const dataParams = [...params, limit, offset];

  const [dataResult, countResult] = await Promise.all([
    pool.query(dataSql, dataParams),
    pool.query(countSql, params),
  ]);

  return {
    rows: dataResult.rows as ProductWithSeller[],
    total: parseTotal(countResult.rows[0]?.total),
  };
}

// Lấy chi tiết thông tin sản phẩm dựa trên đường dẫn slug thân thiện
export async function getProductBySlug(slug: string): Promise<ProductWithSeller | null> {
  const { rows } = await pool.query(
    `SELECT p.*,
        pc.name AS category_name, pc.slug AS category_slug,
        u.full_name AS seller_name, u.avatar_url AS seller_avatar,
        sp.store_name
     FROM products p
     LEFT JOIN product_categories pc ON p.category_id = pc.id
     LEFT JOIN users u ON p.seller_id = u.id
     LEFT JOIN seller_profiles sp ON p.seller_id = sp.user_id
     WHERE p.slug = $1`,
    [slug]
  );
  return (rows[0] as ProductWithSeller) ?? null;
}

// Lấy chi tiết thông tin sản phẩm dựa trên mã ID sản phẩm
export async function getProductById(id: number): Promise<ProductWithSeller | null> {
  const { rows } = await pool.query(
    `SELECT p.*,
        pc.name AS category_name, pc.slug AS category_slug,
        u.full_name AS seller_name, u.avatar_url AS seller_avatar,
        sp.store_name
     FROM products p
     LEFT JOIN product_categories pc ON p.category_id = pc.id
     LEFT JOIN users u ON p.seller_id = u.id
     LEFT JOIN seller_profiles sp ON p.seller_id = sp.user_id
     WHERE p.id = $1`,
    [id]
  );
  return (rows[0] as ProductWithSeller) ?? null;
}

// Lấy danh sách sản phẩm nổi bật
export async function getFeaturedProducts(limit: number): Promise<ProductWithSeller[]> {
  const { rows } = await pool.query(
    `SELECT p.*,
        pc.name AS category_name, pc.slug AS category_slug,
        u.full_name AS seller_name, u.avatar_url AS seller_avatar,
        sp.store_name
     FROM products p
     LEFT JOIN product_categories pc ON p.category_id = pc.id
     LEFT JOIN users u ON p.seller_id = u.id
     LEFT JOIN seller_profiles sp ON p.seller_id = sp.user_id
     WHERE p.status = 'approved' AND p.is_available = TRUE AND p.is_featured = TRUE
     ORDER BY p.total_sold DESC, p.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows as ProductWithSeller[];
}

function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Tạo sản phẩm mới đăng bán từ người bán hàng
export async function createProduct(
  sellerId: number,
  data: CreateProductInput
): Promise<number | null> {
  const baseSlug = slugify(data.name);
  const slug = `${baseSlug}-${Date.now()}`;

  const { rows } = await pool.query(
    `INSERT INTO products
       (seller_id, category_id, name, slug, description, price, sale_price,
        image_url, images, product_type, specs, stock, unit, recipe_id, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'pending')
     RETURNING id`,
    [
      sellerId, data.category_id, data.name, slug, data.description,
      data.price, data.sale_price, data.image_url,
      JSON.stringify(data.images), data.product_type,
      JSON.stringify(data.specs), data.stock, data.unit, data.recipe_id,
    ]
  );
  return Number(rows[0]?.id ?? 0) || null;
}

// Cập nhật thông tin chi tiết của sản phẩm đã đăng bán
export async function updateProduct(
  id: number,
  sellerId: number,
  data: Partial<CreateProductInput>
): Promise<boolean> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (data.name !== undefined) { sets.push(`name = $${idx++}`); params.push(data.name); }
  if (data.description !== undefined) { sets.push(`description = $${idx++}`); params.push(data.description); }
  if (data.price !== undefined) { sets.push(`price = $${idx++}`); params.push(data.price); }
  if (data.sale_price !== undefined) { sets.push(`sale_price = $${idx++}`); params.push(data.sale_price); }
  if (data.image_url !== undefined) { sets.push(`image_url = $${idx++}`); params.push(data.image_url); }
  if (data.images !== undefined) { sets.push(`images = $${idx++}`); params.push(JSON.stringify(data.images)); }
  if (data.category_id !== undefined) { sets.push(`category_id = $${idx++}`); params.push(data.category_id); }
  if (data.specs !== undefined) { sets.push(`specs = $${idx++}`); params.push(JSON.stringify(data.specs)); }
  if (data.stock !== undefined) { sets.push(`stock = $${idx++}`); params.push(data.stock); }
  if (data.unit !== undefined) { sets.push(`unit = $${idx++}`); params.push(data.unit); }

  if (sets.length === 0) return false;
  sets.push('updated_at = NOW()');

  params.push(id, sellerId);
  const { rowCount } = await pool.query(
    `UPDATE products SET ${sets.join(', ')} WHERE id = $${idx++} AND seller_id = $${idx}`,
    params
  );
  return (rowCount ?? 0) > 0;
}

// Xóa sản phẩm của người bán (cập nhật trạng thái sang 'deleted')
export async function deleteProduct(id: number, sellerId: number): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE products SET status = 'deleted', is_available = FALSE WHERE id = $1 AND seller_id = $2`,
    [id, sellerId]
  );
  return (rowCount ?? 0) > 0;
}

// Lấy danh sách sản phẩm của một người bán hàng cụ thể
export async function getProductsBySeller(
  sellerId: number,
  limit: number,
  offset: number
): Promise<{ rows: Product[]; total: number }> {
  const [dataResult, countResult] = await Promise.all([
    pool.query(
      `SELECT p.*, pc.name AS category_name
       FROM products p
       LEFT JOIN product_categories pc ON p.category_id = pc.id
       WHERE p.seller_id = $1 AND p.status != 'deleted'
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [sellerId, limit, offset]
    ),
    pool.query(`SELECT COUNT(*) AS total FROM products WHERE seller_id = $1 AND status != 'deleted'`, [sellerId]),
  ]);
  return {
    rows: dataResult.rows as Product[],
    total: parseTotal(countResult.rows[0]?.total),
  };
}

/* ================================================================
 * Cart
 * ================================================================ */

// Lấy các mặt hàng hiện có trong giỏ hàng của người dùng
export async function getCartItems(userId: number): Promise<CartItem[]> {
  const { rows } = await pool.query(
    `SELECT ci.*,
        p.name AS product_name, p.image_url AS product_image,
        p.price AS product_price, p.sale_price AS product_sale_price,
        p.stock AS product_stock, p.unit AS product_unit,
        p.seller_id, sp.store_name
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     LEFT JOIN seller_profiles sp ON p.seller_id = sp.user_id
     WHERE ci.user_id = $1
     ORDER BY ci.created_at DESC`,
    [userId]
  );
  return rows as CartItem[];
}

// Thêm mặt hàng mới hoặc tăng số lượng của mặt hàng trong giỏ hàng
export async function addCartItem(userId: number, productId: number, quantity: number): Promise<number> {
  const { rows } = await pool.query(
    `INSERT INTO cart_items (user_id, product_id, quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, product_id) DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity
     RETURNING id`,
    [userId, productId, quantity]
  );
  return Number(rows[0]?.id ?? 0);
}

// Cập nhật số lượng của một mặt hàng cụ thể trong giỏ hàng
export async function updateCartQuantity(userId: number, itemId: number, quantity: number): Promise<boolean> {
  const { rowCount } = await pool.query(
    'UPDATE cart_items SET quantity = $1 WHERE id = $2 AND user_id = $3',
    [quantity, itemId, userId]
  );
  return (rowCount ?? 0) > 0;
}

// Xóa một mặt hàng khỏi giỏ hàng
export async function removeCartItem(userId: number, itemId: number): Promise<boolean> {
  const { rowCount } = await pool.query(
    'DELETE FROM cart_items WHERE id = $1 AND user_id = $2',
    [itemId, userId]
  );
  return (rowCount ?? 0) > 0;
}

// Xóa toàn bộ giỏ hàng của người dùng
export async function clearCart(userId: number): Promise<void> {
  await pool.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
}

// Lấy tổng số lượng mặt hàng trong giỏ hàng của người dùng
export async function getCartCount(userId: number): Promise<number> {
  const { rows } = await pool.query(
    'SELECT COALESCE(SUM(quantity), 0) AS total FROM cart_items WHERE user_id = $1',
    [userId]
  );
  return parseTotal(rows[0]?.total);
}

/* ================================================================
 * Orders
 * ================================================================ */

// Tạo đơn hàng mới trong cơ sở dữ liệu (sử dụng Transactions đảm bảo tính nhất quán của stock)
export async function createOrder(
  buyerId: number,
  totalAmount: number,
  shipping: { name: string; phone: string; address: string; payment_method: string; note: string | null },
  items: { product_id: number; seller_id: number; product_name: string; product_image: string | null; quantity: number; unit_price: number; subtotal: number }[],
  cartItemIds?: number[] | null
): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Kiểm tra tồn kho & trừ stock (Optimistic lock)
    for (const item of items) {
      const { rows } = await client.query(
        'UPDATE products SET stock = stock - $1, total_sold = total_sold + $1 WHERE id = $2 AND stock >= $1 RETURNING id',
        [item.quantity, item.product_id]
      );
      if (rows.length === 0) {
        throw { status: 400, message: `Sản phẩm "${item.product_name}" đã hết hàng hoặc không đủ số lượng.` };
      }
    }

    // Tạo order
    const orderResult = await client.query(
      `INSERT INTO orders (buyer_id, total_amount, shipping_name, shipping_phone, shipping_address, payment_method, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [buyerId, totalAmount, shipping.name, shipping.phone, shipping.address, shipping.payment_method, shipping.note]
    );
    const orderId = Number(orderResult.rows[0]?.id);

    // Tạo order items
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, seller_id, product_name, product_image, quantity, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [orderId, item.product_id, item.seller_id, item.product_name, item.product_image, item.quantity, item.unit_price, item.subtotal]
      );
    }

    // Xóa cart
    if (cartItemIds && cartItemIds.length > 0) {
      await client.query(
        'DELETE FROM cart_items WHERE user_id = $1 AND id = ANY($2::int[])',
        [buyerId, cartItemIds]
      );
    } else {
      await client.query('DELETE FROM cart_items WHERE user_id = $1', [buyerId]);
    }

    await client.query('COMMIT');
    return orderId;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Lấy danh sách đơn hàng đã mua của người dùng (phân trang và hỗ trợ tìm kiếm)
export async function getOrdersByBuyer(
  buyerId: number,
  limit: number,
  offset: number,
  q?: string
): Promise<{ rows: OrderWithItems[]; total: number }> {
  let dataSql = `SELECT *, NOT EXISTS (
    SELECT 1 FROM order_items oi 
    JOIN products p ON oi.product_id = p.id 
    JOIN product_categories pc ON p.category_id = pc.id 
    WHERE oi.order_id = orders.id AND pc.slug != 'do-an-san'
  ) AS is_fast_food_only FROM orders WHERE buyer_id = $1`;
  let countSql = 'SELECT COUNT(*) AS total FROM orders WHERE buyer_id = $1';
  const params: unknown[] = [buyerId];

  if (q && q.trim()) {
    const searchVal = `%${q.trim()}%`;
    params.push(searchVal);
    const filterCond = ` AND (
      shipping_name ILIKE $2 OR
      shipping_phone ILIKE $2 OR
      shipping_address ILIKE $2 OR
      id::text ILIKE $2 OR
      EXISTS (
        SELECT 1 FROM order_items oi 
        WHERE oi.order_id = orders.id AND oi.product_name ILIKE $2
      )
    )`;
    dataSql += filterCond;
    countSql += filterCond;
  }

  dataSql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const dataParams = [...params, limit, offset];

  const [dataResult, countResult] = await Promise.all([
    pool.query(dataSql, dataParams),
    pool.query(countSql, params),
  ]);

  const orders = dataResult.rows as OrderWithItems[];
  if (orders.length > 0) {
    const orderIds = orders.map(o => o.id);
    const { rows: itemRows } = await pool.query(
      `SELECT oi.*, p.slug AS product_slug
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ANY($1)
       ORDER BY oi.id`,
      [orderIds]
    );

    for (const order of orders) {
      order.items = itemRows.filter(item => item.order_id === order.id);
    }
  }

  return {
    rows: orders,
    total: parseTotal(countResult.rows[0]?.total),
  };
}

// Lấy thông tin chi tiết của một đơn hàng theo ID kèm danh sách sản phẩm
export async function getOrderById(orderId: number): Promise<OrderWithItems | null> {
  const { rows: orderRows } = await pool.query(
    `SELECT *, NOT EXISTS (
      SELECT 1 FROM order_items oi 
      JOIN products p ON oi.product_id = p.id 
      JOIN product_categories pc ON p.category_id = pc.id 
      WHERE oi.order_id = orders.id AND pc.slug != 'do-an-san'
    ) AS is_fast_food_only FROM orders WHERE id = $1`,
    [orderId]
  );
  if (orderRows.length === 0) return null;

  const { rows: itemRows } = await pool.query(
    `SELECT oi.*, p.slug AS product_slug
     FROM order_items oi
     LEFT JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = $1
     ORDER BY oi.id`,
    [orderId]
  );

  return {
    ...(orderRows[0] as Order),
    items: itemRows as OrderItem[],
  };
}

// Lấy danh sách đơn hàng mà người bán hàng nhận được từ người mua
export async function getOrdersBySeller(
  sellerId: number,
  limit: number,
  offset: number
): Promise<{ rows: OrderWithItems[]; total: number }> {
  const dataSql = `SELECT DISTINCT o.*, NOT EXISTS (
      SELECT 1 FROM order_items oi2 
      JOIN products p ON oi2.product_id = p.id 
      JOIN product_categories pc ON p.category_id = pc.id 
      WHERE oi2.order_id = o.id AND pc.slug != 'do-an-san'
    ) AS is_fast_food_only
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE oi.seller_id = $1
    ORDER BY o.created_at DESC
    LIMIT $2 OFFSET $3`;
  const countSql = `SELECT COUNT(DISTINCT o.id) AS total
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE oi.seller_id = $1`;

  const [dataResult, countResult] = await Promise.all([
    pool.query(dataSql, [sellerId, limit, offset]),
    pool.query(countSql, [sellerId]),
  ]);

  const orders = dataResult.rows as OrderWithItems[];
  if (orders.length > 0) {
    const orderIds = orders.map(o => o.id);
    const { rows: itemRows } = await pool.query(
      `SELECT oi.*, p.slug AS product_slug
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ANY($1) AND oi.seller_id = $2
       ORDER BY oi.id`,
      [orderIds, sellerId]
    );

    for (const order of orders) {
      order.items = itemRows.filter(item => item.order_id === order.id);
    }
  }

  return {
    rows: orders,
    total: parseTotal(countResult.rows[0]?.total),
  };
}

// Cập nhật trạng thái của đơn hàng (có hỗ trợ lý do hủy đơn hàng)
export async function updateOrderStatus(orderId: number, status: string, reason?: string): Promise<boolean> {
  const sets = ['status = $1', 'updated_at = NOW()'];
  const params: unknown[] = [status];

  if (reason !== undefined) {
    sets.push(`cancelled_reason = $${params.length + 1}`);
    params.push(reason);
  }
  params.push(orderId);

  const { rowCount } = await pool.query(
    `UPDATE orders SET ${sets.join(', ')} WHERE id = $${params.length}`,
    params
  );
  return (rowCount ?? 0) > 0;
}

/* ================================================================
 * Reviews
 * ================================================================ */

// Lấy danh sách đánh giá sản phẩm của người dùng
export async function getProductReviews(
  productId: number,
  limit: number,
  offset: number
): Promise<{ rows: ProductReview[]; total: number }> {
  const [dataResult, countResult] = await Promise.all([
    pool.query(
      `SELECT pr.*, u.full_name, u.avatar_url
       FROM product_reviews pr
       JOIN users u ON u.id = pr.user_id
       WHERE pr.product_id = $1
       ORDER BY pr.created_at DESC
       LIMIT $2 OFFSET $3`,
      [productId, limit, offset]
    ),
    pool.query('SELECT COUNT(*) AS total FROM product_reviews WHERE product_id = $1', [productId]),
  ]);
  return {
    rows: dataResult.rows as ProductReview[],
    total: parseTotal(countResult.rows[0]?.total),
  };
}

// Tạo đánh giá cho sản phẩm thuộc đơn hàng của người dùng (tự động cập nhật số liệu rating trung bình sản phẩm)
export async function createReview(
  userId: number,
  productId: number,
  orderId: number,
  rating: number,
  comment: string | null
): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO product_reviews (product_id, user_id, order_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, product_id, order_id)
       DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = NOW()
       RETURNING id`,
      [productId, userId, orderId, rating, comment]
    );

    // Cập nhật rating trung bình
    await client.query(
      `UPDATE products SET
         rating = (SELECT COALESCE(AVG(rating), 0) FROM product_reviews WHERE product_id = $1),
         total_reviews = (SELECT COUNT(*) FROM product_reviews WHERE product_id = $1)
       WHERE id = $1`,
      [productId]
    );

    await client.query('COMMIT');
    return Number(rows[0]?.id ?? 0);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Lấy danh sách đánh giá của một đơn hàng cụ thể từ người dùng
export async function getOrderReviews(
  orderId: number,
  userId: number
): Promise<ProductReview[]> {
  const { rows } = await pool.query(
    `SELECT pr.*, u.full_name, u.avatar_url
     FROM product_reviews pr
     JOIN users u ON u.id = pr.user_id
     WHERE pr.order_id = $1 AND pr.user_id = $2
     ORDER BY pr.created_at DESC`,
    [orderId, userId]
  );
  return rows as ProductReview[];
}

/* ================================================================
 * Wishlist
 * ================================================================ */

// Lấy danh sách các sản phẩm yêu thích (Wishlist) của người dùng
export async function getWishlist(userId: number): Promise<WishlistItem[]> {
  const { rows } = await pool.query(
    `SELECT wi.*, p.name AS product_name, p.slug AS product_slug, p.image_url AS product_image,
            p.price AS product_price, p.sale_price AS product_sale_price,
            p.unit AS product_unit, p.stock AS product_stock,
            p.rating AS product_rating, p.total_reviews AS product_total_reviews,
            p.status AS product_status, p.is_available AS product_is_available,
            sp.store_name
     FROM wishlist_items wi
     JOIN products p ON p.id = wi.product_id
     LEFT JOIN seller_profiles sp ON sp.user_id = p.seller_id
     WHERE wi.user_id = $1
     ORDER BY wi.created_at DESC`,
    [userId]
  );
  return rows as WishlistItem[];
}

// Bật/tắt trạng thái yêu thích của một sản phẩm
export async function toggleWishlist(userId: number, productId: number): Promise<boolean> {
  const { rows } = await pool.query(
    'SELECT id FROM wishlist_items WHERE user_id = $1 AND product_id = $2',
    [userId, productId]
  );
  if (rows.length > 0) {
    await pool.query('DELETE FROM wishlist_items WHERE user_id = $1 AND product_id = $2', [userId, productId]);
    return false;
  }
  await pool.query('INSERT INTO wishlist_items (user_id, product_id) VALUES ($1, $2)', [userId, productId]);
  return true;
}

// Kiểm tra xem sản phẩm có nằm trong danh sách yêu thích của người dùng không
export async function isInWishlist(userId: number, productId: number): Promise<boolean> {
  const { rows } = await pool.query(
    'SELECT id FROM wishlist_items WHERE user_id = $1 AND product_id = $2',
    [userId, productId]
  );
  return rows.length > 0;
}

/* ================================================================
 * Bundles
 * ================================================================ */

// Lấy danh sách các gói combo (bundles) đang hoạt động
export async function getActiveBundles(limit: number): Promise<ProductBundle[]> {
  const { rows } = await pool.query(
    'SELECT * FROM product_bundles WHERE is_active = TRUE ORDER BY created_at DESC LIMIT $1',
    [limit]
  );
  return rows as ProductBundle[];
}

// Lấy thông tin chi tiết một gói combo sản phẩm theo slug
export async function getBundleBySlug(slug: string): Promise<BundleWithItems | null> {
  const { rows: bundleRows } = await pool.query(
    'SELECT * FROM product_bundles WHERE slug = $1',
    [slug]
  );
  if (bundleRows.length === 0) return null;

  const bundle = bundleRows[0] as ProductBundle;
  const { rows: itemRows } = await pool.query(
    `SELECT bi.*, p.name AS product_name, p.image_url AS product_image, p.price AS product_price
     FROM bundle_items bi
     JOIN products p ON p.id = bi.product_id
     WHERE bi.bundle_id = $1`,
    [bundle.id]
  );

  return { ...bundle, items: itemRows as BundleItem[] };
}

/* ================================================================
 * Admin — duyệt sản phẩm
 * ================================================================ */

// Quản trị viên lấy danh sách toàn bộ sản phẩm của hệ thống (phân trang và lọc theo trạng thái duyệt)
export async function getAllProductsAdmin(
  limit: number,
  offset: number,
  status?: string
): Promise<{ rows: ProductWithSeller[]; total: number }> {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (status) {
    params.push(status);
    conditions.push(`p.status = $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [dataResult, countResult] = await Promise.all([
    pool.query(
      `SELECT p.*, pc.name AS category_name, pc.slug AS category_slug,
              u.full_name AS seller_name, u.avatar_url AS seller_avatar,
              sp.store_name
       FROM products p
       LEFT JOIN product_categories pc ON p.category_id = pc.id
       LEFT JOIN users u ON p.seller_id = u.id
       LEFT JOIN seller_profiles sp ON p.seller_id = sp.user_id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    pool.query(
      `SELECT COUNT(*) AS total FROM products p ${where}`,
      params
    ),
  ]);

  return {
    rows: dataResult.rows as ProductWithSeller[],
    total: parseTotal(countResult.rows[0]?.total),
  };
}

// Quản trị viên cập nhật trạng thái duyệt của sản phẩm (approved, pending, rejected)
export async function updateProductStatus(productId: number, status: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    'UPDATE products SET status = $1, updated_at = NOW() WHERE id = $2',
    [status, productId]
  );
  return (rowCount ?? 0) > 0;
}

/* ================================================================
 * Smart Features: Recipe → Products matching
 * ================================================================ */

/**
 * Tìm sản phẩm khớp với danh sách nguyên liệu (fuzzy ILIKE search).
 * Mỗi keyword tạo OR condition → trả về danh sách products phù hợp nhất.
 */
  // Tìm kiếm sản phẩm phù hợp với danh sách nguyên liệu (fuzzy ILIKE search)
  export async function matchProductsByIngredients(
  ingredientKeywords: string[],
  limit = 20
): Promise<ProductWithSeller[]> {
  if (ingredientKeywords.length === 0) return [];

  // Build OR conditions for each keyword
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  for (const kw of ingredientKeywords) {
    const cleaned = kw.trim();
    if (!cleaned || cleaned.length < 2) continue;
    params.push(`%${cleaned}%`);
    conditions.push(`p.name ILIKE $${params.length}`);
  }

  if (conditions.length === 0) return [];

  params.push(limit);
  const sql = `
    SELECT p.*,
      pc.name AS category_name, pc.slug AS category_slug,
      u.full_name AS seller_name, u.avatar_url AS seller_avatar,
      sp.store_name
    FROM products p
    LEFT JOIN product_categories pc ON p.category_id = pc.id
    LEFT JOIN users u ON p.seller_id = u.id
    LEFT JOIN seller_profiles sp ON p.seller_id = sp.user_id
    WHERE p.status = 'approved' AND p.is_available = TRUE
      AND (${conditions.join(' OR ')})
    ORDER BY p.total_sold DESC, p.rating DESC
    LIMIT $${params.length}
  `;

  const { rows } = await pool.query(sql, params);
  return rows as ProductWithSeller[];
}

/**
 * Lấy danh sách products theo mảng IDs (cho AI recommend).
 */
  // Lấy danh sách products theo mảng IDs (cho AI recommend)
  export async function getProductsByIds(ids: number[]): Promise<ProductWithSeller[]> {
  if (ids.length === 0) return [];

  const { rows } = await pool.query(
    `SELECT p.*,
        pc.name AS category_name, pc.slug AS category_slug,
        u.full_name AS seller_name, u.avatar_url AS seller_avatar,
        sp.store_name
     FROM products p
     LEFT JOIN product_categories pc ON p.category_id = pc.id
     LEFT JOIN users u ON p.seller_id = u.id
     LEFT JOIN seller_profiles sp ON p.seller_id = sp.user_id
     WHERE p.id = ANY($1) AND p.status = 'approved' AND p.is_available = TRUE
     ORDER BY p.is_featured DESC, p.total_sold DESC`,
    [ids]
  );
  return rows as ProductWithSeller[];
}
