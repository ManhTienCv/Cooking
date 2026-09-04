import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import cors from 'cors';
import connectPgSimple from 'connect-pg-simple';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { env } from './env.js';
import { pool } from './db/pool.js';

// Ensure database enums and chat structure are fully updated
void (async () => {
  try {
    const res = await pool.query(
      `SELECT 1 FROM pg_type t
       JOIN pg_enum e ON t.oid = e.enumtypid
       WHERE t.typname = 'transaction_type' AND e.enumlabel = 'payment'`
    );
    if ((res.rowCount ?? 0) === 0) {
      console.log("[db] Adding 'payment' value to transaction_type enum...");
      await pool.query("ALTER TYPE transaction_type ADD VALUE 'payment'");
      console.log("[db] transaction_type enum updated successfully!");
    }
  } catch (err) {
    console.error("[db] Failed to ensure 'payment' in transaction_type enum:", err);
  }

  try {
    console.log("[db] Ensuring google_id and nullable password_hash on users table...");
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(100) UNIQUE`);
    await pool.query(`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`);
    console.log("[db] Ensured google_id column and nullable password_hash successfully!");
  } catch (err) {
    console.error("[db] Failed to ensure google_id on users table:", err);
  }


  try {
    console.log("[db] Running chat migration to unify Shopee-style chats...");
    // 1. Ensure general conversations exist for all active conversations
    await pool.query(
      `INSERT INTO chat_conversations (buyer_id, seller_id, product_id, order_id)
       SELECT DISTINCT buyer_id, seller_id, NULL::integer, NULL::integer
       FROM chat_conversations
       ON CONFLICT (buyer_id, seller_id) WHERE product_id IS NULL AND order_id IS NULL DO NOTHING`
    );

    // 2. Update chat messages to point to the general conversations
    await pool.query(
      `UPDATE chat_messages cm
       SET conversation_id = gen.id
       FROM chat_conversations old_c
       JOIN chat_conversations gen ON gen.buyer_id = old_c.buyer_id 
                                  AND gen.seller_id = old_c.seller_id 
                                  AND gen.product_id IS NULL 
                                  AND gen.order_id IS NULL
       WHERE cm.conversation_id = old_c.id AND old_c.id <> gen.id`
    );

    // 3. Delete non-general duplicate conversations
    await pool.query(
      `DELETE FROM chat_conversations
       WHERE product_id IS NOT NULL OR order_id IS NOT NULL`
    );
    console.log("[db] Chat migration completed successfully!");
  } catch (err) {
    console.error("[db] Chat migration failed:", err);
  }
})();

import { ensureCsrfToken } from './middleware/csrf.js';
import { authRouter } from './routes/auth.js';
import { recipesRouter } from './routes/recipes.js';
import { blogRouter } from './routes/blog.js';
import { healthRouter } from './routes/health.js';
import { adminRouter } from './routes/admin.js';
import { feedbackRouter } from './routes/feedback.js';
import { marketplaceRouter } from './routes/marketplace.js';
import { messagesRouter } from './routes/messages.js';
import { usersRouter } from './routes/users.js';
import { ewalletRouter } from './routes/ewallet.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(cookieParser());
const pgSession = connectPgSimple(session);

const isProduction = env.nodeEnv === 'production';
const isLocalOrigin = (origin: string): boolean => {
  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
};
const usesCrossSiteHttpsCookies =
  isProduction ||
  env.corsOrigins.some((origin) => origin.startsWith('https://') && !isLocalOrigin(origin));
const sessionCookieOptions = {
  path: '/',
  sameSite: usesCrossSiteHttpsCookies ? 'none' : 'lax',
  secure: usesCrossSiteHttpsCookies,
} as const;

app.use(
  session({
    store: new pgSession({
      pool: pool,
      tableName: 'session',
    }),
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    name: 'cook.sid',
    cookie: {
      ...sessionCookieOptions,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);


app.use(
  cors({
    origin: env.corsOrigins,
    credentials: true,
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(ensureCsrfToken);

app.get('/api/healthz', (_req, res) => {
  res.json({ ok: true, service: 'cookapp-server' });
});

app.get('/api/readyz', async (_req, res) => {
  try {
    await pool.query('SELECT 1 AS ok');
    res.json({ ok: true, service: 'cookapp-server', db: true });
  } catch {
    res.status(503).json({ ok: false, service: 'cookapp-server', db: false });
  }
});

app.use((req, res, next) => {
  if (req.method === 'GET') {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Expires', '-1');
    res.set('Pragma', 'no-cache');
  }
  next();
});

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/blog', blogRouter);
app.use('/api/health', healthRouter);
app.use('/api/recipes', recipesRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/marketplace', marketplaceRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/users', usersRouter);
app.use('/api/ewallet', ewalletRouter);

// MoMo IPN Webhook URL directly matching MOMO_IPN_URL config
import { handleMoMoIpnHandler } from './routes/marketplace.js';
app.post('/api/v1/payment/momo/ipn', handleMoMoIpnHandler);

app.use(errorHandler);

console.info(
  `[SMTP] config host=${env.smtpHost || '(empty)'} port=${env.smtpPort} secure=${env.smtpSecure}`
);

app.listen(env.port, () => {
  console.log(`cookapp-server listening on http://localhost:${env.port}`);
});
