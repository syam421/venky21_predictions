const express = require('express');
const router = express.Router();
const {
  handleLogin,
  handleLogout,
  handleGetMe,
  handleChangePassword
} = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');
const { loginRateLimiter } = require('../middleware/rateLimiter');

// Rate-limited login endpoint
router.post('/login', loginRateLimiter, handleLogin);

// Protected auth endpoints
router.post('/logout', requireAuth, handleLogout);
router.get('/me', requireAuth, handleGetMe);
router.post('/change-password', requireAuth, handleChangePassword);

module.exports = router;
