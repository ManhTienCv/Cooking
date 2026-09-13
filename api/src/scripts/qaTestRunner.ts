import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { env } from '../env.js';

const BASE_URL = `http://localhost:${env.port}`;

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  expected: string;
  actual: string;
  error?: string;
}

const results: TestResult[] = [];

class HttpClient {
  private cookies: string[] = [];
  public csrfToken: string = '';

  private getCookieHeader(): string {
    return this.cookies.map(c => c.split(';')[0]).join('; ');
  }

  private updateCookies(res: Response) {
    const setCookieHeaders = res.headers.getSetCookie?.() || [];
    for (const sc of setCookieHeaders) {
      const part = sc.split(';')[0];
      const name = part.split('=')[0];
      this.cookies = this.cookies.filter(c => !c.startsWith(name + '='));
      this.cookies.push(part);
    }
  }

  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers || {});
    headers.set('x-test-bypass', 'true');
    if (this.cookies.length > 0) {
      headers.set('Cookie', this.getCookieHeader());
    }
    if (this.csrfToken && (options.method === 'POST' || options.method === 'PUT' || options.method === 'DELETE')) {
      if (!headers.has('x-csrf-token')) {
        headers.set('x-csrf-token', this.csrfToken);
      }
    }
    const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
    const res = await fetch(fullUrl, { ...options, headers });
    this.updateCookies(res);
    return res;
  }

  async getCsrf(): Promise<string> {
    const res = await this.fetch('/api/auth/csrf');
    const data = await res.json() as { csrfToken: string };
    this.csrfToken = data.csrfToken;
    return this.csrfToken;
  }
}

async function recordTest(
  category: string,
  name: string,
  fn: () => Promise<{ passed: boolean; expected: string; actual: string }>
) {
  try {
    const r = await fn();
    results.push({
      category,
      name,
      passed: r.passed,
      expected: r.expected,
      actual: r.actual,
    });
    console.log(`${r.passed ? '✅ PASS' : '❌ FAIL'}: [${category}] ${name}`);
    if (!r.passed) {
      console.log(`   Expected: ${r.expected} | Got: ${r.actual}`);
    }
  } catch (err: any) {
    results.push({
      category,
      name,
      passed: false,
      expected: 'No uncaught exception',
      actual: `Threw error: ${err.message}`,
      error: String(err),
    });
    console.log(`❌ ERROR: [${category}] ${name} -> ${err.message}`);
  }
}

async function runQA() {
  console.log('====================================================');
  console.log('🚀 RUNNING AUTOMATED QA TEST SUITE — COOKING SYSTEM');
  console.log('====================================================\n');

  // Ensure QA Buyer exists
  const buyerEmail = 'qa-buyer@cook.local';
  const buyerPass = 'Buyer@Cook123456';
  const buyerHash = await bcrypt.hash(buyerPass, 10);
  await pool.query(`
    INSERT INTO users (full_name, email, password_hash)
    VALUES ('QA Buyer Test', $1, $2)
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
  `, [buyerEmail, buyerHash]);

  const guest = new HttpClient();
  const buyer = new HttpClient();
  const admin = new HttpClient();
  const attacker = new HttpClient();

  // ----------------------------------------------------
  // SECTION 1: Health & System Diagnostics
  // ----------------------------------------------------
  await recordTest('System Diagnostics', 'GET /api/readyz returns ok:true & db:true', async () => {
    const res = await guest.fetch('/api/readyz');
    const data = await res.json() as any;
    return {
      passed: res.status === 200 && data.ok === true && data.db === true,
      expected: 'HTTP 200 { ok: true, db: true }',
      actual: `HTTP ${res.status} ${JSON.stringify(data)}`,
    };
  });

  // ----------------------------------------------------
  // SECTION 2: Security & Unauthenticated Access
  // ----------------------------------------------------
  await recordTest('Security / Boundary', 'Guest access to /api/marketplace/orders blocked with 401', async () => {
    const res = await guest.fetch('/api/marketplace/orders');
    return {
      passed: res.status === 401,
      expected: 'HTTP 401',
      actual: `HTTP ${res.status}`,
    };
  });

  await recordTest('Security / Boundary', 'Guest access to /api/admin/dashboard blocked with 401', async () => {
    const res = await guest.fetch('/api/admin/dashboard');
    return {
      passed: res.status === 401,
      expected: 'HTTP 401',
      actual: `HTTP ${res.status}`,
    };
  });

  await recordTest('Security / CSRF', 'POST /api/auth/login without CSRF token returns 403', async () => {
    const rawClient = new HttpClient();
    const res = await rawClient.fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: buyerEmail, password: 'password123' }),
    });
    return {
      passed: res.status === 403,
      expected: 'HTTP 403 CSRF forbidden',
      actual: `HTTP ${res.status}`,
    };
  });

  // ----------------------------------------------------
  // SECTION 3: Auth Journeys
  // ----------------------------------------------------
  await buyer.getCsrf();
  await admin.getCsrf();

  await recordTest('Auth (Buyer)', 'Buyer login with invalid password returns 401', async () => {
    const res = await buyer.fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: buyerEmail, password: 'WrongPassword999!' }),
    });
    return {
      passed: res.status === 401,
      expected: 'HTTP 401',
      actual: `HTTP ${res.status}`,
    };
  });

  await recordTest('Auth (Buyer)', 'Buyer login with valid credentials succeeds', async () => {
    const res = await buyer.fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: buyerEmail, password: buyerPass }),
    });
    const data = await res.json() as any;
    return {
      passed: res.status === 200 && data.success === true && data.user?.email === buyerEmail,
      expected: 'HTTP 200 { success: true, user: buyerEmail }',
      actual: `HTTP ${res.status} ${JSON.stringify(data)}`,
    };
  });

  await recordTest('Security / Role Check', 'Buyer session attempting /api/admin/dashboard blocked with 401', async () => {
    const res = await buyer.fetch('/api/admin/dashboard');
    return {
      passed: res.status === 401,
      expected: 'HTTP 401 (Admin session required)',
      actual: `HTTP ${res.status}`,
    };
  });

  await recordTest('Auth (Admin)', 'Admin login with valid credentials succeeds', async () => {
    const res = await admin.fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@cook.local', password: 'Admin@Cook123456' }),
    });
    const data = await res.json() as any;
    return {
      passed: res.status === 200 && data.success === true,
      expected: 'HTTP 200 { success: true }',
      actual: `HTTP ${res.status} ${JSON.stringify(data)}`,
    };
  });

  // ----------------------------------------------------
  // SECTION 4: KitchenCook E-commerce Journeys
  // ----------------------------------------------------
  let targetProduct: any = null;

  await recordTest('KitchenCook / Browse', 'GET /api/marketplace/products returns active products list', async () => {
    const res = await guest.fetch('/api/marketplace/products?limit=5');
    const data = await res.json() as any;
    if (data.products && data.products.length > 0) {
      targetProduct = data.products[0];
    }
    return {
      passed: res.status === 200 && data.success === true && Array.isArray(data.products) && data.products.length > 0,
      expected: 'HTTP 200 with products array',
      actual: `HTTP ${res.status}, found ${data.products?.length || 0} products`,
    };
  });

  await recordTest('KitchenCook / Edge Case', 'GET /api/marketplace/products/999999999 returns 404', async () => {
    const res = await guest.fetch('/api/marketplace/products/999999999');
    return {
      passed: res.status === 404,
      expected: 'HTTP 404',
      actual: `HTTP ${res.status}`,
    };
  });

  // Negative Order: Empty Items
  await recordTest('KitchenCook / Negative Order', 'Order creation with empty items array rejected', async () => {
    const res = await buyer.fetch('/api/marketplace/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shipping_name: 'Test Buyer',
        shipping_phone: '0912345678',
        shipping_address: '123 Đường Test, Quận 1, TP.HCM',
        payment_method: 'cod',
        items: [],
      }),
    });
    return {
      passed: res.status >= 400 && res.status < 500,
      expected: 'HTTP 400/422 bad request',
      actual: `HTTP ${res.status}`,
    };
  });

  // Negative Order: Quantity <= 0
  await recordTest('KitchenCook / Negative Order', 'Order creation with quantity <= 0 rejected', async () => {
    if (!targetProduct) return { passed: false, expected: 'Product exists', actual: 'No product' };
    const res = await buyer.fetch('/api/marketplace/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shipping_name: 'Test Buyer',
        shipping_phone: '0912345678',
        shipping_address: '123 Đường Test, Quận 1, TP.HCM',
        payment_method: 'cod',
        items: [{ product_id: targetProduct.id, quantity: -2 }],
      }),
    });
    return {
      passed: res.status >= 400 && res.status < 500,
      expected: 'HTTP 400/422 bad request',
      actual: `HTTP ${res.status}`,
    };
  });

  // Negative Order: Invalid phone format
  await recordTest('KitchenCook / Negative Order', 'Order creation with invalid phone rejected', async () => {
    if (!targetProduct) return { passed: false, expected: 'Product exists', actual: 'No product' };
    const res = await buyer.fetch('/api/marketplace/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shipping_name: 'Test Buyer',
        shipping_phone: 'invalid-phone-abc',
        shipping_address: '123 Đường Test, Quận 1, TP.HCM',
        payment_method: 'cod',
        items: [{ product_id: targetProduct.id, quantity: 1 }],
      }),
    });
    return {
      passed: res.status >= 400 && res.status < 500,
      expected: 'HTTP 400/422 bad request',
      actual: `HTTP ${res.status}`,
    };
  });

  // Happy Path: Order Creation & Stock Deduction
  let createdOrderId: number | null = null;
  let initialStock = targetProduct ? Number(targetProduct.stock || 0) : 0;

  await recordTest('KitchenCook / Happy Path', 'Create order (COD) successfully & generate CAM- order code', async () => {
    if (!targetProduct) return { passed: false, expected: 'Target product exists', actual: 'None' };

    const pCheck = await pool.query('SELECT stock FROM products WHERE id = $1', [targetProduct.id]);
    initialStock = Number(pCheck.rows[0]?.stock || 0);

    // 1. Add product to cart first
    const cartRes = await buyer.fetch('/api/marketplace/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: targetProduct.id, quantity: 1 }),
    });
    const cartData = await cartRes.json() as any;
    if (!cartData.success && !cartData.cart_id) {
      return { passed: false, expected: 'Cart add success', actual: JSON.stringify(cartData) };
    }

    // 2. Submit order from cart
    const res = await buyer.fetch('/api/marketplace/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shipping_name: 'Khách Hàng QA Test',
        shipping_phone: '0901234567',
        shipping_address: '456 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM',
        shipping_note: 'Giao giờ hành chính - QA Test run',
        payment_method: 'cod',
      }),
    });
    const data = await res.json() as any;
    if (data.order_id) createdOrderId = data.order_id;

    return {
      passed: res.status === 200 && data.success === true && Boolean(data.order_id),
      expected: 'HTTP 200 with order_id',
      actual: `HTTP ${res.status} order_id=${data.order_id}`,
    };
  });

  // Cross-system check 1: Stock deducted in DB
  await recordTest('Cross-System Integration', 'Product stock quantity is deducted by 1 after order creation', async () => {
    if (!targetProduct) return { passed: false, expected: 'Product exists', actual: 'None' };
    const pAfter = await pool.query('SELECT stock FROM products WHERE id = $1', [targetProduct.id]);
    const currentStock = Number(pAfter.rows[0]?.stock || 0);
    return {
      passed: currentStock === initialStock - 1,
      expected: `Stock = ${initialStock - 1}`,
      actual: `Stock = ${currentStock}`,
    };
  });

  // Cross-system check 2: Order visible in Admin Orders
  await recordTest('Cross-System Integration', 'Created order is immediately visible to Admin in /api/admin/marketplace/orders', async () => {
    if (!createdOrderId) return { passed: false, expected: 'Order created', actual: 'No order' };
    const res = await admin.fetch(`/api/admin/marketplace/orders`);
    let orderFound = false;
    if (res.status === 200) {
      const data = await res.json() as any;
      const orders = data.orders || [];
      orderFound = orders.some((o: any) => o.id === createdOrderId);
    }
    return {
      passed: orderFound,
      expected: `Admin orders list contains order #${createdOrderId}`,
      actual: `Admin orders HTTP ${res.status}, found=${orderFound}`,
    };
  });

  // Security Test: IDOR on Order Detail & Order Cancel
  await attacker.getCsrf();
  const attackerEmail = 'attacker-qa@cook.local';
  const attackerHash = await bcrypt.hash('Attacker@123456', 10);
  await pool.query(`
    INSERT INTO users (full_name, email, password_hash)
    VALUES ('Attacker QA', $1, $2)
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
  `, [attackerEmail, attackerHash]);

  await attacker.fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: attackerEmail, password: 'Attacker@123456' }),
  });

  await recordTest('Security / IDOR Protection', 'Attacker cannot view another user\'s order detail', async () => {
    if (!createdOrderId) return { passed: false, expected: 'Order exists', actual: 'No order' };
    const res = await attacker.fetch(`/api/marketplace/orders/${createdOrderId}`);
    return {
      passed: res.status === 403 || res.status === 404 || res.status === 401,
      expected: 'HTTP 403 / 404 / 401 Forbidden',
      actual: `HTTP ${res.status}`,
    };
  });

  await recordTest('Security / IDOR Protection', 'Attacker cannot cancel another user\'s order', async () => {
    if (!createdOrderId) return { passed: false, expected: 'Order exists', actual: 'No order' };
    const res = await attacker.fetch(`/api/marketplace/orders/${createdOrderId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancel_reason: 'Hacked by attacker' }),
    });
    return {
      passed: res.status === 403 || res.status === 404 || res.status === 401,
      expected: 'HTTP 403 / 404 / 401 Forbidden',
      actual: `HTTP ${res.status}`,
    };
  });

  // Happy Path: Order Cancellation by Owner & Stock Restoration
  await recordTest('KitchenCook / Happy Path', 'Buyer cancels pending order with valid reason', async () => {
    if (!createdOrderId) return { passed: false, expected: 'Order exists', actual: 'No order' };
    const res = await buyer.fetch(`/api/marketplace/orders/${createdOrderId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancel_reason: 'Đổi ý không muốn mua nữa' }),
    });
    const data = await res.json() as any;
    return {
      passed: res.status === 200 && data.success === true,
      expected: 'HTTP 200 { success: true }',
      actual: `HTTP ${res.status} ${JSON.stringify(data)}`,
    };
  });

  // Cross-system check 3: Stock restored after cancellation
  await recordTest('Cross-System Integration', 'Product stock quantity is refunded (+1) after cancellation', async () => {
    if (!targetProduct) return { passed: false, expected: 'Product exists', actual: 'None' };
    const pRestored = await pool.query('SELECT stock FROM products WHERE id = $1', [targetProduct.id]);
    const restoredStock = Number(pRestored.rows[0]?.stock || 0);
    return {
      passed: restoredStock === initialStock,
      expected: `Restored stock = ${initialStock}`,
      actual: `Stock = ${restoredStock}`,
    };
  });

  // Negative: Cancelling already cancelled order
  await recordTest('KitchenCook / Edge Case', 'Attempting to cancel an already cancelled order returns error', async () => {
    if (!createdOrderId) return { passed: false, expected: 'Order exists', actual: 'No order' };
    const res = await buyer.fetch(`/api/marketplace/orders/${createdOrderId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancel_reason: 'Thử huỷ lại lần 2' }),
    });
    return {
      passed: res.status >= 400,
      expected: 'HTTP 400 error',
      actual: `HTTP ${res.status}`,
    };
  });

  // ----------------------------------------------------
  // SECTION 5: CookingBoy Social & Content Flow
  // ----------------------------------------------------
  await recordTest('CookingBoy / Browse', 'GET /api/recipes/search returns public approved recipes', async () => {
    const res = await guest.fetch('/api/recipes/search?limit=5');
    const data = await res.json() as any;
    const recipes = data.recipes || data.data || [];
    return {
      passed: res.status === 200 && Array.isArray(recipes),
      expected: 'HTTP 200 with recipes array',
      actual: `HTTP ${res.status}, recipes count=${recipes.length}`,
    };
  });

  await recordTest('CookingBoy / Security (SQL Injection)', 'Recipe search with SQL injection payload is safely handled', async () => {
    const res = await guest.fetch('/api/recipes/search?q=' + encodeURIComponent("'; DROP TABLE test; --"));
    return {
      passed: res.status === 200,
      expected: 'HTTP 200 without SQL error',
      actual: `HTTP ${res.status}`,
    };
  });

  // Cross-System 4: User creates recipe -> pending -> Admin approves -> appears in public
  let createdRecipeId: number | null = null;
  const uniqueTitle = `Món Test QA Tự Động #${Date.now()}`;

  await recordTest('CookingBoy / Creation', 'Buyer submits new recipe (saved as pending)', async () => {
    const res = await buyer.fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: uniqueTitle,
        description: 'Mô tả ngắn cho công thức món test QA tự động',
        cooking_time: 30,
        servings: 4,
        difficulty: 'medium',
        instructions: 'Bước 1: Chuẩn bị nguyên liệu.\nBước 2: Nấu chín.\nBước 3: Thưởng thức.',
        ingredients: 'Thịt bò 500g, Tiêu đen 10g',
        category_id: 1,
      }),
    });
    const data = await res.json() as any;
    if (data.recipe?.id || data.id) createdRecipeId = data.recipe?.id || data.id;
    return {
      passed: (res.status === 200 || res.status === 201) && Boolean(createdRecipeId),
      expected: 'HTTP 200/201 with new recipe id',
      actual: `HTTP ${res.status} id=${createdRecipeId}`,
    };
  });

  await recordTest('Cross-System Integration', 'Unapproved recipe does NOT appear in public recipe search', async () => {
    const res = await guest.fetch(`/api/recipes/search?q=${encodeURIComponent(uniqueTitle)}`);
    const data = await res.json() as any;
    const list = data.recipes || data.data || [];
    const found = list.some((r: any) => r.title === uniqueTitle);
    return {
      passed: !found,
      expected: 'Unapproved recipe is hidden from public list',
      actual: `Found in public=${found}`,
    };
  });

  await recordTest('Cross-System Integration', 'Admin approves recipe in /api/admin/recipes/:id/approve', async () => {
    if (!createdRecipeId) return { passed: false, expected: 'Recipe created', actual: 'No recipe' };
    const res = await admin.fetch(`/api/admin/recipes/${createdRecipeId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json() as any;
    return {
      passed: res.status === 200 && data.success === true,
      expected: 'HTTP 200 { success: true }',
      actual: `HTTP ${res.status} ${JSON.stringify(data)}`,
    };
  });

  await recordTest('Cross-System Integration', 'Approved recipe immediately appears in public search', async () => {
    const res = await guest.fetch(`/api/recipes/search?q=${encodeURIComponent(uniqueTitle)}`);
    const data = await res.json() as any;
    const list = data.recipes || data.data || [];
    const found = list.some((r: any) => r.title === uniqueTitle);
    return {
      passed: found,
      expected: 'Approved recipe is now visible in public list',
      actual: `Found in public=${found}`,
    };
  });

  // ----------------------------------------------------
  // SECTION 6: Clean Up QA Artefacts (Restore clean state)
  // ----------------------------------------------------
  console.log('\n🧹 Cleaning up test artifacts...');
  if (createdRecipeId) {
    await pool.query('DELETE FROM recipes WHERE id = $1', [createdRecipeId]);
  }
  if (createdOrderId) {
    await pool.query('DELETE FROM order_transit_logs WHERE order_id = $1', [createdOrderId]);
    await pool.query('DELETE FROM order_items WHERE order_id = $1', [createdOrderId]);
    await pool.query('DELETE FROM orders WHERE id = $1', [createdOrderId]);
  }
  await pool.query('DELETE FROM users WHERE email IN ($1, $2)', [buyerEmail, attackerEmail]);
  await pool.query('UPDATE products SET total_sold = 0');

  console.log('\n====================================================');
  const passedCount = results.filter(r => r.passed).length;
  console.log(`📊 QA TEST EXECUTION FINISHED: ${passedCount}/${results.length} PASSED`);
  console.log('====================================================');

  await pool.end();
}

runQA().catch(err => {
  console.error('Fatal error in QA runner:', err);
  process.exit(1);
});
