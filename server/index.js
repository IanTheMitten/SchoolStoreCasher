import express from 'express';
import cors from 'cors';
import pino from 'pino';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { accessSync, constants } from 'fs';
import { apiKeyAuth, sessionMiddleware, requireAuth } from './lib/auth.js';
import productsRouter from './routes/products.js';
import studentsRouter from './routes/students.js';
import salesRouter from './routes/sales.js';
import gradesRouter from './routes/grades.js';
import expensesRouter from './routes/expenses.js';
import authRouter from './routes/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  } : undefined
});

const app = express();
const PORT = process.env.PORT || 4000;

// Trust proxy - Required for Render (and other reverse proxy setups)
// This ensures Express correctly detects HTTPS and sets cookies properly
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sessions
app.use(sessionMiddleware());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`
    });
  });
  
  next();
});

// API key authentication (optional, on top of session auth if configured)
if (process.env.API_KEY) {
  app.use('/api', apiKeyAuth);
}

// Auth routes (login/logout) - available for both integrated and separate frontend
app.use('/', authRouter);

// Health check (public, no auth required)
app.get('/api/ping', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Protect API routes behind authentication
// Only protect /api/* routes, not static file serving
app.use('/api', requireAuth);

// API Routes (all protected by requireAuth above)
app.use('/api/products', productsRouter);
app.use('/api/students', studentsRouter);
app.use('/api/sales', salesRouter);
app.use('/api/transactions', salesRouter); // Sales router handles GET /api/transactions
app.use('/api/grades', gradesRouter);
app.use('/api/expenses', expensesRouter);

// Serve static files from React build (if it exists and SERVE_FRONTEND is not 'false')
// This allows backend to work as API-only when frontend is deployed separately
const serveFrontend = process.env.SERVE_FRONTEND !== 'false';
const buildPath = join(__dirname, '../../build');

if (serveFrontend) {
  try {
    accessSync(buildPath, constants.F_OK);
    const indexPath = resolve(buildPath, 'index.html'); // Use resolve for absolute path
    accessSync(indexPath, constants.F_OK); // Verify index.html exists
    
    // Build directory exists, serve static files
    // Configure static middleware to serve index.html for root path
    app.use(express.static(buildPath, { index: false })); // Don't auto-serve index.html, we'll handle it
    
    // For SPA routing, all non-API routes should serve index.html
    // This must be after all API routes but before 404 handler
    app.get('*', (req, res, next) => {
      // Skip if this is an API route or auth route
      if (req.path.startsWith('/api') || req.path.startsWith('/login') || req.path.startsWith('/logout')) {
        logger.debug({ path: req.path }, 'Skipping SPA route - API/auth route');
        return next(); // Pass to 404 handler
      }
      
      // For all other routes (including root /), serve index.html for SPA routing
      logger.debug({ path: req.path }, 'Serving index.html for SPA route');
      res.sendFile(indexPath, (err) => {
        if (err) {
          logger.error({ error: err.message, path: req.path, stack: err.stack }, 'Error serving index.html');
          next(err); // Pass to error handler
        } else {
          logger.debug({ path: req.path }, 'Successfully served index.html');
        }
      });
    });
    logger.info(`Serving React frontend from ${buildPath}`);
  } catch (err) {
    // Build directory doesn't exist, skip static file serving
    logger.warn({ error: err.message, buildPath }, 'React build directory not found, skipping static file serving');
  }
} else {
  logger.info('Frontend serving disabled (SERVE_FRONTEND=false). Backend is API-only.');
}

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error({
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Database: PostgreSQL via DATABASE_URL`);
  logger.info(`Accessible at: http://0.0.0.0:${PORT}`);
});

export default app;

