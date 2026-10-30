const rateLimit = require('express-rate-limit');

/**
 * Login rate limiter: max 10 attempts per 15 minutes per IP
 */
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'TOO_MANY_LOGIN_ATTEMPTS',
    message: 'Too many login attempts from this IP. Please try again after 15 minutes.'
  }
});

/**
 * General API rate limiter: max 300 requests per minute
 */
const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests. Please slow down.'
  }
});

module.exports = {
  loginRateLimiter,
  generalRateLimiter
};
