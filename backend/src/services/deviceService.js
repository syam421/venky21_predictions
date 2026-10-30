const prisma = require('../database/prisma');
const env = require('../config/env');
const { logSecurityEvent } = require('./auditService');

/**
 * Registers a new device session for a user while enforcing the 2-device limit.
 * Uses a transactional query to prevent race conditions.
 */
async function registerDeviceSession({
  userId,
  sessionId,
  deviceFingerprint = null,
  deviceLabel = 'Web Browser',
  ipAddress = null,
  userAgent = null
}) {
  const maxDevices = env.MAX_ACTIVE_DEVICES_PER_USER;

  // Transactionally verify active device count and insert
  const result = await prisma.$transaction(async (tx) => {
    // Count active devices for this user
    const activeSessions = await tx.deviceSession.findMany({
      where: {
        userId,
        status: 'ACTIVE'
      },
      orderBy: { lastActiveAt: 'asc' }
    });

    // Check if the current device/session is already registered and active
    const existingCurrentSession = activeSessions.find(
      s => s.sessionId === sessionId || (deviceFingerprint && s.deviceFingerprint === deviceFingerprint)
    );

    if (existingCurrentSession) {
      // Update its last active time and details
      const updated = await tx.deviceSession.update({
        where: { id: existingCurrentSession.id },
        data: {
          sessionId,
          lastActiveAt: new Date(),
          ipAddress: ipAddress || existingCurrentSession.ipAddress,
          deviceLabel: deviceLabel || existingCurrentSession.deviceLabel
        }
      });
      return { success: true, session: updated, activeCount: activeSessions.length, isNew: false };
    }

    // If already at or above limit (>= 2 devices)
    if (activeSessions.length >= maxDevices) {
      return {
        success: false,
        code: 'DEVICE_LIMIT_REACHED',
        message: `Maximum of ${maxDevices} active devices reached. Please revoke an existing device from another session or contact administrator.`,
        activeCount: activeSessions.length,
        devices: activeSessions.map(d => ({
          id: d.id,
          deviceLabel: d.deviceLabel,
          firstRegisteredAt: d.firstRegisteredAt,
          lastActiveAt: d.lastActiveAt
        }))
      };
    }

    // Create new device session
    const createdSession = await tx.deviceSession.create({
      data: {
        userId,
        sessionId,
        deviceFingerprint,
        deviceLabel: deviceLabel.slice(0, 100),
        ipAddress: ipAddress ? String(ipAddress).slice(0, 45) : null,
        status: 'ACTIVE',
        firstRegisteredAt: new Date(),
        lastActiveAt: new Date()
      }
    });

    return {
      success: true,
      session: createdSession,
      activeCount: activeSessions.length + 1,
      isNew: true
    };
  }, { maxWait: 10000, timeout: 20000 });

  // Log audit event asynchronously outside transaction
  if (result.success && result.isNew) {
    logSecurityEvent({
      eventType: 'DEVICE_REGISTERED',
      actorId: userId,
      targetUserId: userId,
      ipAddress,
      userAgent,
      details: {
        deviceId: result.session.id,
        deviceLabel: result.session.deviceLabel,
        activeDeviceCount: result.activeCount
      }
    }).catch(() => {});
  }

  return result;
}

/**
 * Revokes an active device session
 */
async function revokeDeviceSession({ deviceId, actorId, isRevokedByAdmin = false }) {
  const device = await prisma.deviceSession.findUnique({
    where: { id: deviceId }
  });

  if (!device) {
    throw new Error('Device session not found');
  }

  const updated = await prisma.deviceSession.update({
    where: { id: deviceId },
    data: {
      status: 'REVOKED',
      revokedAt: new Date()
    }
  });

  await logSecurityEvent({
    eventType: isRevokedByAdmin ? 'ADMIN_DEVICE_REVOKED' : 'DEVICE_REVOKED',
    actorId,
    targetUserId: device.userId,
    details: {
      deviceId,
      deviceLabel: device.deviceLabel
    }
  });

  return updated;
}

/**
 * Validates whether a given sessionId is still active
 */
async function validateSession(sessionId) {
  if (!sessionId) return null;

  const session = await prisma.deviceSession.findUnique({
    where: { sessionId },
    include: {
      user: {
        select: {
          id: true,
          phoneNumber: true,
          role: true,
          accountStatus: true,
          mustChangePassword: true
        }
      }
    }
  });

  if (!session || session.status !== 'ACTIVE') {
    return null;
  }

  // Touch lastActiveAt throttled (e.g. if lastActiveAt > 1 minute ago)
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  if (session.lastActiveAt < oneMinuteAgo) {
    await prisma.deviceSession.update({
      where: { id: session.id },
      data: { lastActiveAt: new Date() }
    }).catch(() => {});
  }

  return session;
}

/**
 * Revokes all sessions for a user (e.g. on suspension or password reset)
 */
async function revokeAllUserSessions(userId, actorId) {
  await prisma.deviceSession.updateMany({
    where: {
      userId,
      status: 'ACTIVE'
    },
    data: {
      status: 'REVOKED',
      revokedAt: new Date()
    }
  });

  await logSecurityEvent({
    eventType: 'ALL_SESSIONS_REVOKED',
    actorId,
    targetUserId: userId
  });
}

module.exports = {
  registerDeviceSession,
  revokeDeviceSession,
  validateSession,
  revokeAllUserSessions
};
