require('dotenv').config();

const env = {
  PORT: parseInt(process.env.PORT, 10) || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  JWT_SECRET: process.env.JWT_SECRET || 'venky_vip_default_jwt_secret_change_in_production_32_chars',
  COOKIE_SECRET: process.env.COOKIE_SECRET || 'venky_vip_default_cookie_secret_change_in_production_32',
  ADMIN_INITIAL_PHONE: process.env.ADMIN_INITIAL_PHONE || '8074784250',
  ADMIN_INITIAL_PASSWORD: process.env.ADMIN_INITIAL_PASSWORD || 'Apache160@#',
  LOTTERY_API_URL: process.env.LOTTERY_API_URL || 'https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json',
  POLL_INTERVAL_MS: parseInt(process.env.POLL_INTERVAL_MS, 10) || 3000,
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  SUBSCRIPTION_PRICE_INR: parseInt(process.env.SUBSCRIPTION_PRICE_INR, 10) || 1500,
  SUBSCRIPTION_DURATION_DAYS: parseInt(process.env.SUBSCRIPTION_DURATION_DAYS, 10) || 30,
  MAX_ACTIVE_DEVICES_PER_USER: parseInt(process.env.MAX_ACTIVE_DEVICES_PER_USER, 10) || 2
};

// Validate critical production configurations
if (env.NODE_ENV === 'production') {
  if (env.JWT_SECRET.length < 32) {
    throw new Error('SECURITY ERROR: JWT_SECRET must be at least 32 characters in production.');
  }
}

module.exports = env;
