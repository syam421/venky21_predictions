const prisma = require('../database/prisma');
const { hashPassword } = require('../services/authService');
const { grantOrExtendSubscription } = require('../services/subscriptionService');
const { revokeDeviceSession, revokeAllUserSessions } = require('../services/deviceService');
const { logSecurityEvent, getAuditLogs } = require('../services/auditService');
const { normalizePhoneNumber, validatePassword, sanitizeText } = require('../validators/inputValidators');
const env = require('../config/env');

/**
 * Get dashboard statistics
 */
async function getAdminStats(req, res, next) {
  try {
    const now = new Date();

    const [totalUsers, activeSubs, expiredSubs, suspendedUsers, revenueAgg] = await Promise.all([
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.subscription.count({
        where: {
          status: 'ACTIVE',
          expiresAt: { gt: now }
        }
      }),
      prisma.subscription.count({
        where: {
          OR: [
            { status: 'EXPIRED' },
            { expiresAt: { lte: now } }
          ]
        }
      }),
      prisma.user.count({ where: { role: 'USER', accountStatus: 'SUSPENDED' } }),
      prisma.subscription.aggregate({
        _sum: { amount: true },
        where: { paymentStatus: 'PAID' }
      })
    ]);

    return res.json({
      success: true,
      stats: {
        totalUsers,
        activeSubscriptions: activeSubs,
        expiredSubscriptions: expiredSubs,
        suspendedUsers,
        totalRevenueINR: revenueAgg._sum.amount || 0
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * List / search users
 */
async function listUsers(req, res, next) {
  try {
    const { search, status, page = 1, limit = 50 } = req.query;
    const take = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const where = { role: 'USER' };
    if (search) {
      where.phoneNumber = { contains: search.trim() };
    }
    if (status) {
      where.accountStatus = status;
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          phoneNumber: true,
          role: true,
          accountStatus: true,
          mustChangePassword: true,
          notes: true,
          createdAt: true,
          subscriptions: {
            orderBy: { expiresAt: 'desc' },
            take: 1,
            select: {
              id: true,
              status: true,
              startAt: true,
              expiresAt: true,
              amount: true,
              paymentStatus: true
            }
          },
          deviceSessions: {
            where: { status: 'ACTIVE' },
            select: { id: true, deviceLabel: true, lastActiveAt: true }
          }
        }
      })
    ]);

    const formatted = users.map(u => {
      const latestSub = u.subscriptions[0] || null;
      const isSubActive = latestSub && new Date(latestSub.expiresAt) > new Date() && latestSub.status === 'ACTIVE';

      return {
        id: u.id,
        phoneNumber: u.phoneNumber,
        accountStatus: u.accountStatus,
        mustChangePassword: u.mustChangePassword,
        notes: u.notes,
        createdAt: u.createdAt,
        activeDeviceCount: u.deviceSessions.length,
        subscription: latestSub
          ? {
              status: isSubActive ? 'ACTIVE' : 'EXPIRED',
              expiresAt: latestSub.expiresAt,
              amount: latestSub.amount,
              paymentStatus: latestSub.paymentStatus
            }
          : null
      };
    });

    return res.json({
      success: true,
      total,
      page: parseInt(page, 10) || 1,
      limit: take,
      users: formatted
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Administrator creates a user account
 * ONLY authenticated admin can call this!
 */
async function createUser(req, res, next) {
  try {
    const { phoneNumber, initialPassword, durationDays = 30, amount = 1500, notes } = req.body;

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number. Please provide a valid 10-digit mobile number.'
      });
    }

    const pwdVal = validatePassword(initialPassword);
    if (!pwdVal.valid) {
      return res.status(400).json({ success: false, message: pwdVal.message });
    }

    // Check if phone already registered
    const existing = await prisma.user.findUnique({
      where: { phoneNumber: normalizedPhone }
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A user account with this phone number already exists.'
      });
    }

    const passwordHash = await hashPassword(initialPassword);

    // Create user and initial subscription in transaction
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          phoneNumber: normalizedPhone,
          passwordHash,
          role: 'USER',
          accountStatus: 'ACTIVE',
          mustChangePassword: true, // User must change temp password on first login
          notes: sanitizeText(notes)
        }
      });

      const now = new Date();
      const expiresAt = new Date(now.getTime() + (parseInt(durationDays, 10) || 30) * 24 * 60 * 60 * 1000);

      await tx.subscription.create({
        data: {
          userId: user.id,
          startAt: now,
          expiresAt,
          amount: parseInt(amount, 10) || 1500,
          currency: 'INR',
          status: 'ACTIVE',
          paymentStatus: 'PAID',
          createdByAdminId: req.user.id,
          notes: 'Initial administrator activation'
        }
      });

      return user;
    });

    await logSecurityEvent({
      eventType: 'USER_CREATED',
      actorId: req.user.id,
      targetUserId: newUser.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: {
        phoneNumber: newUser.phoneNumber,
        durationDays: parseInt(durationDays, 10) || 30,
        amount: parseInt(amount, 10) || 1500
      }
    });

    return res.status(201).json({
      success: true,
      message: 'User account created and subscription activated successfully.',
      user: {
        id: newUser.id,
        phoneNumber: newUser.phoneNumber,
        accountStatus: newUser.accountStatus,
        mustChangePassword: newUser.mustChangePassword
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Suspend a user account
 */
async function suspendUser(req, res, next) {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'ADMIN') {
      return res.status(400).json({ success: false, message: 'Cannot suspend administrator accounts' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { accountStatus: 'SUSPENDED' }
    });

    // Revoke all active device sessions immediately
    await revokeAllUserSessions(userId, req.user.id);

    await logSecurityEvent({
      eventType: 'USER_SUSPENDED',
      actorId: req.user.id,
      targetUserId: userId,
      details: { reason: sanitizeText(reason) }
    });

    return res.json({
      success: true,
      message: 'User has been suspended and all active sessions revoked.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Activate a suspended user account
 */
async function activateUser(req, res, next) {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { accountStatus: 'ACTIVE' }
    });

    await logSecurityEvent({
      eventType: 'USER_ACTIVATED',
      actorId: req.user.id,
      targetUserId: userId
    });

    return res.json({
      success: true,
      message: 'User account has been activated.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin reset user password
 */
async function resetUserPassword(req, res, next) {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    const pwdVal = validatePassword(newPassword);
    if (!pwdVal.valid) {
      return res.status(400).json({ success: false, message: pwdVal.message });
    }

    const newHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        mustChangePassword: true
      }
    });

    // Invalidate sessions so user must log in with new password
    await revokeAllUserSessions(userId, req.user.id);

    await logSecurityEvent({
      eventType: 'ADMIN_RESET_PASSWORD',
      actorId: req.user.id,
      targetUserId: userId
    });

    return res.json({
      success: true,
      message: 'Password reset successfully. The user must change their password on next login.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Grant or extend user subscription
 */
async function extendSubscription(req, res, next) {
  try {
    const { userId } = req.params;
    const { durationDays = 30, amount = 1500, notes } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const sub = await grantOrExtendSubscription({
      userId,
      adminId: req.user.id,
      durationDays: parseInt(durationDays, 10) || 30,
      amount: parseInt(amount, 10) || 1500,
      notes: sanitizeText(notes)
    });

    return res.json({
      success: true,
      message: 'Subscription extended successfully.',
      subscription: sub
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get devices for a user
 */
async function getUserDevices(req, res, next) {
  try {
    const { userId } = req.params;
    const devices = await prisma.deviceSession.findMany({
      where: { userId },
      orderBy: { lastActiveAt: 'desc' }
    });

    return res.json({
      success: true,
      devices
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin revoke a specific device
 */
async function revokeDevice(req, res, next) {
  try {
    const { deviceId } = req.params;
    await revokeDeviceSession({
      deviceId,
      actorId: req.user.id,
      isRevokedByAdmin: true
    });

    return res.json({
      success: true,
      message: 'Device session revoked successfully.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get audit logs
 */
async function getAuditLogsController(req, res, next) {
  try {
    const { page, limit, eventType } = req.query;
    const result = await getAuditLogs({ page, limit, eventType });
    return res.json({
      success: true,
      ...result
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAdminStats,
  listUsers,
  createUser,
  suspendUser,
  activateUser,
  resetUserPassword,
  extendSubscription,
  getUserDevices,
  revokeDevice,
  getAuditLogsController
};
