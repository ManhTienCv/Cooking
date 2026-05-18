import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import cors from 'cors';
import connectPgSimple from 'connect-pg-simple';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { env } from './env.js';
import { pool } from './db/pool.js';
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
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
      secure: env.nodeEnv === 'production',
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

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`cookapp-server listening on http://localhost:${env.port}`);
});
