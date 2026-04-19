import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import cors from 'cors';
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

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(cookieParser());
app.use(
  session({
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

app.use(express.json({ limit: '2mb' }));
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

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/blog', blogRouter);
app.use('/api/health', healthRouter);
app.use('/api/recipes', recipesRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (env.nodeEnv === 'production') {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    console.error('Request error:', msg);
  } else {
    console.error(err);
  }
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(env.port, () => {
  console.log(`cookapp-server listening on http://localhost:${env.port}`);
});
