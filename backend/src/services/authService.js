const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../database/prisma');
const env = require('../config/env');
const { logSecurityEvent } = require('./auditService');
const { registerDeviceSession, revokeAllUserSessions } = require('./deviceService');
const { checkSubscriptionStatus } = require('./subscriptionService');
const { normalizePhoneNumber, validatePassword } = require('../validators/inputValidators');

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Hash password securely using bcrypt
 */
async function hashPassword(plainPassword) {
  return await bcrypt.hash(plainPassword, BCRYPT_SALT_ROUNDS);
}

/**
 * Compare plain password against hash
 */
async function comparePassword(plainPassword, passwordHash) {
  return await bcrypt.compare(plainPassword, passwordHash);
}

/**
 * Generate secure session token and ID
 */
function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Sign JWT containing userId, role, and sessionId
 */
function createAuthToken({ userId, role, sessionId }) {
  return jwt.sign(
    { userId, role, sessionId },
    env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

/**
 * Authenticates user login
 */
async function loginUser({
  phoneNumber,
  password,
  deviceLabel = 'Browser Session',
  ipAddress = null,
  userAgent = null
}) {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  if (!normalizedPhone || !password) {
    throw { status: 400, message: 'Invalid phone number or password format' };
  }

  // Find user by normalized phone
  const user = await prisma.user.findUnique({
    where: { phoneNumber: normalizedPhone }
  });

  if (!user) {
    await logSecurityEvent({
      eventType: 'LOGIN_FAILED',
      ipAddress,
      userAgent,
      details: { reason: 'User not found' }
    });
    // Generic message to prevent enumeration
    throw { status: 401, message: 'Invalid phone number or password' };
  }

  // Check account status
  if (user.accountStatus === 'SUSPENDED') {
    await logSecurityEvent({
      eventType: 'LOGIN_BLOCKED_SUSPENDED',
      targetUserId: user.id,
      ipAddress,
      userAgent
    });
    throw { status: 403, message: 'Your account is suspended. Please contact administrator.' };
  }

  if (user.accountStatus === 'INACTIVE') {
    throw { status: 403, message: 'Your account is inactive. Please contact administrator.' };
  }

  // Verify password
  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    await logSecurityEvent({
      eventType: 'LOGIN_FAILED',
      targetUserId: user.id,
      ipAddress,
      userAgent,
      details: { reason: 'Incorrect password' }
    });
    throw { status: 401, message: 'Invalid phone number or password' };
  }

  // If user is ordinary user, check subscription status
  let subStatus = null;
  if (user.role === 'USER') {
    subStatus = await checkSubscriptionStatus(user.id);
    if (!subStatus.isActive) {
      await logSecurityEvent({
        eventType: 'LOGIN_BLOCKED_EXPIRED',
        targetUserId: user.id,
        ipAddress,
        userAgent
      });
      throw {
        status: 403,
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'Your subscription has expired. Please contact administrator to renew.'
      };
    }
  }

  // Generate unique session ID and register device
  const sessionId = generateSessionId();
  const deviceReg = await registerDeviceSession({
    userId: user.id,
    sessionId,
    deviceLabel,
    ipAddress,
    userAgent
  });

  if (!deviceReg.success) {
    await logSecurityEvent({
      eventType: 'LOGIN_BLOCKED_DEVICE_LIMIT',
      targetUserId: user.id,
      ipAddress,
      userAgent,
      details: { activeCount: deviceReg.activeCount }
    });
    throw {
      status: 403,
      code: deviceReg.code,
      message: deviceReg.message,
      devices: deviceReg.devices
    };
  }

  // Log successful login
  await logSecurityEvent({
    eventType: user.role === 'ADMIN' ? 'ADMIN_LOGIN_SUCCESS' : 'USER_LOGIN_SUCCESS',
    actorId: user.id,
    targetUserId: user.id,
    ipAddress,
    userAgent,
    details: { deviceId: deviceReg.session.id }
  });

  // Issue signed token
  const token = createAuthToken({
    userId: user.id,
    role: user.role,
    sessionId
  });

  return {
    token,
    user: {
      id: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role,
      mustChangePassword: user.mustChangePassword
    },
    subscription: subStatus ? subStatus.subscription : null,
    sessionId
  };
}

/**
 * Changes user password
 */
async function changePassword({ userId, oldPassword, newPassword, actorId, isForce = false }) {
  const pwdValidation = validatePassword(newPassword);
  if (!pwdValidation.valid) {
    throw { status: 400, message: pwdValidation.message };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw { status: 404, message: 'User not found' };
  }

  if (!isForce) {
    const isMatch = await comparePassword(oldPassword, user.passwordHash);
    if (!isMatch) {
      throw { status: 401, message: 'Current password does not match' };
    }
  }

  const newHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: newHash,
      mustChangePassword: false
    }
  });

  await logSecurityEvent({
    eventType: isForce ? 'ADMIN_RESET_PASSWORD' : 'USER_CHANGED_PASSWORD',
    actorId,
    targetUserId: userId
  });

  // Revoke all prior sessions except current
  await revokeAllUserSessions(userId, actorId);

  return { success: true };
}

module.exports = {
  hashPassword,
  comparePassword,
  generateSessionId,
  createAuthToken,
  loginUser,
  changePassword
};
