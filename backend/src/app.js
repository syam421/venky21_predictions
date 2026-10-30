const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const { generalRateLimiter } = require('./middleware/rateLimiter');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const predictionRoutes = require('./routes/predictionRoutes');

const app = express();

// Set security headers
app.use(helmet({
  contentSecurityPolicy: false, // Allows clean SPA operation
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS Configuration with strict origin and credentials
const allowedOrigins = [env.CORS_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server) or in dev
    if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsers with size limit
app.use(express.json({ limit: '15kb' }));
app.use(express.urlencoded({ extended: true, limit: '15kb' }));
app.use(cookieParser(env.COOKIE_SECRET));

// General rate limiter on all API endpoints
app.use('/api', generalRateLimiter);

// Public Health Check Endpoint (exposes no sensitive internals)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/predictions', predictionRoutes);

// 404 Handler
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    code: 'ROUTE_NOT_FOUND',
    message: 'The requested API endpoint does not exist.'
  });
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
