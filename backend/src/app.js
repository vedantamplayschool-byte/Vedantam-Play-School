import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const defaultOrigins = [
  'http://localhost:5000',
  'http://127.0.0.1:5000'
];

const allowedOrigins = new Set([
  ...defaultOrigins,
  ...env.clientOrigins
]);

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin'
    }
  })
);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.has(origin)) {
        return cb(null, true);
      }
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);

app.use(
  '/api/v1/auth/login',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many login attempts. Please try again later.'
    }
  })
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 250,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(compression());
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.use(
  '/uploads',
  express.static(path.join(__dirname, '..', 'uploads'), {
    maxAge: env.nodeEnv === 'production' ? '30d' : 0,
    immutable: env.nodeEnv === 'production'
  })
);

/**
 * Serve the static frontend (index.html, admin.html, css/, js/, etc.) when
 * the project root is present alongside the backend (e.g. on Replit, where
 * frontend + backend share one repo and one port). On Render, the deployed
 * service root is `backend/` only, so these files won't exist and this
 * middleware simply falls through to the routes/handlers below — no change
 * to the existing API-only production behavior on Render.
 */
const frontendRoot = path.join(__dirname, '..', '..');
app.use(
  express.static(frontendRoot, {
    maxAge: env.nodeEnv === 'production' ? '1h' : 0,
    index: ['index.html']
  })
);

app.use('/api/v1', routes);

/**
 * Root Route (Health Check)
 */
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Vedantam Play School API is running 🚀',
    status: 'OK'
  });
});

app.use(notFound);
app.use(errorHandler);

export default app;
