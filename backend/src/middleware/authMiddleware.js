const jwt = require('jsonwebtoken');
const env = require('../config/env');
const prisma = require('../database/prisma');
const { validateSession } = require('../services/deviceService');
const { checkSubscriptionStatus } = require('../services/subscriptionService');

/**
 * Authentication Middleware
 * Validates JWT, verifies active device session in DB, verifies account & subscription status.
 */
async function requireAuth(req, res, next) {
  try {
    let token = null;

    // 1. Check HTTP-only cookie first
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // 2. Fallback to Authorization: Bearer <token>
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.substring(7).trim();
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHENTICATED',
        message: 'Authentication session required. Please log in.'
      });
    }

    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_TOKEN',
        message: 'Session has expired or is invalid. Please log in again.'
      });
    }

    // Verify that the device session is still ACTIVE in database
    const session = await validateSession(decoded.sessionId);
    if (!session) {
      return res.status(401).json({
        success: false,
        code: 'SESSION_REVOKED',
        message: 'This device session has been revoked or logged out.'
      });
    }

    const user = session.user;

    // Check account status
    if (user.accountStatus === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_SUSPENDED',
        message: 'Your account has been suspended by the administrator.'
      });
    }

    if (user.accountStatus === 'INACTIVE') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_INACTIVE',
        message: 'Your account is inactive. Please contact the administrator.'
      });
    }

    // Attach user and session to request
    req.user = user;
    req.sessionId = decoded.sessionId;
    req.deviceSession = session;

    // If user is ordinary user, check subscription status
    if (user.role === 'USER') {
      const subStatus = await checkSubscriptionStatus(user.id);
      req.subscriptionStatus = subStatus;

      // Allow profile & password change even if expired, but block protected features
      const isExemptRoute = req.path.includes('/subscription') ||
                            req.path.includes('/change-password') ||
                            req.path.includes('/profile') ||
                            req.path.includes('/devices');

      if (!subStatus.isActive && !isExemptRoute) {
        return res.status(403).json({
          success: false,
          code: 'SUBSCRIPTION_EXPIRED',
          message: 'Your subscription has expired. Please contact administrator to renew.',
          expiresAt: subStatus.subscription ? subStatus.subscription.expiresAt : null
        });
      }
    }

    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      code: 'AUTH_ERROR',
      message: 'Failed to authenticate session'
    });
  }
}

/**
 * Authorization Middleware: Enforce Administrator Role
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN_NOT_ADMIN',
      message: 'Access denied. Administrator privileges required.'
    });
  }
  next();
}

module.exports = {
  requireAuth,
  requireAdmin
};
