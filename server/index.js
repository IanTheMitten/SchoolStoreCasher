import express from 'express';
import cors from 'cors';
import pino from 'pino';
import { apiKeyAuth, sessionMiddleware, requireAuth } from './lib/auth.js';
import productsRouter from './routes/products.js';
import studentsRouter from './routes/students.js';
import salesRouter from './routes/sales.js';
import gradesRouter from './routes/grades.js';
import expensesRouter from './routes/expenses.js';
import authRouter from './routes/auth.js';

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

// Auth routes (login/logout)
app.use('/', authRouter);

// Protect all app routes behind authentication
app.use(requireAuth);

// Health check
app.get('/api/ping', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/products', productsRouter);
app.use('/api/students', studentsRouter);
app.use('/api/sales', salesRouter);
app.use('/api/transactions', salesRouter); // Sales router handles GET /api/transactions
app.use('/api/grades', gradesRouter);
app.use('/api/expenses', expensesRouter);

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

