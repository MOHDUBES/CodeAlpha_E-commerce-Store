require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();

// Security and Efficiency Middlewares
app.use(helmet({ contentSecurityPolicy: false })); // CSP disabled for inline scripts
app.use(compression());
app.use(cors({ origin: '*' })); // Should restrict in prod
app.use(express.json());

// Rate Limiting for Auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window`
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// API Routes
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/seller', require('./routes/seller'));

// Global API Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled API Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
