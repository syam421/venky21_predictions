const { loginUser, changePassword } = require('../services/authService');
const { revokeDeviceSession } = require('../services/deviceService');
const { checkSubscriptionStatus } = require('../services/subscriptionService');
const env = require('../config/env');
const prisma = require('../database/prisma');

async function handleLogin(req, res, next) {
  try {
    const { phoneNumber, password, deviceLabel } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await loginUser({
      phoneNumber,
      password,
      deviceLabel: deviceLabel || userAgent || 'Web Browser',
      ipAddress,
      userAgent
    });

    // Set secure HTTP-only cookie
    const isProduction = env.NODE_ENV === 'production';
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    return res.json({
      success: true,
      message: 'Login successful',
      user: result.user,
      subscription: result.subscription,
      token: result.token
    });
  } catch (err) {
    next(err);
  }
}

async function handleLogout(req, res, next) {
  try {
    if (req.deviceSession) {
      await revokeDeviceSession({
        deviceId: req.deviceSession.id,
        actorId: req.user.id,
        isRevokedByAdmin: false
      });
    }

    res.clearCookie('token', {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax'
    });

    return res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (err) {
    next(err);
  }
}

async function handleGetMe(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        phoneNumber: true,
        role: true,
        accountStatus: true,
        mustChangePassword: true,
        createdAt: true
      }
    });

    let subscription = null;
    if (user.role === 'USER') {
      const subStatus = await checkSubscriptionStatus(user.id);
      subscription = subStatus.subscription
        ? {
            id: subStatus.subscription.id,
            status: subStatus.subscription.status,
            expiresAt: subStatus.subscription.expiresAt,
            daysRemaining: subStatus.daysRemaining,
            amount: subStatus.subscription.amount,
            currency: subStatus.subscription.currency
          }
        : null;
    }

    // Active devices
    const activeSessions = await prisma.deviceSession.findMany({
      where: {
        userId: user.id,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        deviceLabel: true,
        firstRegisteredAt: true,
        lastActiveAt: true,
        sessionId: true
      }
    });

    return res.json({
      success: true,
      user,
      subscription,
      activeDevices: activeSessions.map(s => ({
        id: s.id,
        deviceLabel: s.deviceLabel,
        firstRegisteredAt: s.firstRegisteredAt,
        lastActiveAt: s.lastActiveAt,
        isCurrent: s.sessionId === req.sessionId
      }))
    });
  } catch (err) {
    next(err);
  }
}

async function handleChangePassword(req, res, next) {
  try {
    const { oldPassword, newPassword } = req.body;
    await changePassword({
      userId: req.user.id,
      oldPassword,
      newPassword,
      actorId: req.user.id,
      isForce: false
    });

    res.clearCookie('token');

    return res.json({
      success: true,
      message: 'Password changed successfully. Please log in with your new password.'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleLogin,
  handleLogout,
  handleGetMe,
  handleChangePassword
};
