const prisma = require('../database/prisma');

/**
 * Audit Logging Service
 * Records administrative and security events safely.
 * IMPORTANT: NEVER passes plaintext passwords, hashes, or secrets into details!
 */
async function logSecurityEvent({
  eventType,
  actorId = null,
  targetUserId = null,
  ipAddress = null,
  userAgent = null,
  details = null
}) {
  try {
    let sanitizedDetails = null;
    if (details) {
      if (typeof details === 'object') {
        // Deep clone and delete sensitive fields if accidentally included
        const safeObj = { ...details };
        delete safeObj.password;
        delete safeObj.passwordHash;
        delete safeObj.token;
        delete safeObj.secret;
        sanitizedDetails = JSON.stringify(safeObj);
      } else {
        sanitizedDetails = String(details).slice(0, 500);
      }
    }

    // Ensure actorId and targetUserId exist before assigning foreign key
    let validActorId = null;
    let validTargetId = null;

    if (actorId) {
      const userExists = await prisma.user.findUnique({ where: { id: actorId }, select: { id: true } });
      if (userExists) validActorId = actorId;
    }

    if (targetUserId) {
      const userExists = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
      if (userExists) validTargetId = targetUserId;
    }

    return await prisma.auditLog.create({
      data: {
        eventType,
        actorId: validActorId,
        targetUserId: validTargetId,
        ipAddress: ipAddress ? String(ipAddress).slice(0, 45) : null,
        userAgent: userAgent ? String(userAgent).slice(0, 255) : null,
        details: sanitizedDetails
      }
    });
  } catch (err) {
    // Non-blocking error handling for audit logs so background business logic does not crash
    if (process.env.NODE_ENV !== 'test') {
      console.warn('AuditLog Notice:', err.message);
    }
    return null;
  }
}

/**
 * Retrieves audit logs for admin view
 */
async function getAuditLogs({ limit = 100, page = 1, eventType = null } = {}) {
  const take = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

  const where = {};
  if (eventType) {
    where.eventType = eventType;
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        actor: { select: { id: true, phoneNumber: true, role: true } },
        targetUser: { select: { id: true, phoneNumber: true, role: true } }
      }
    })
  ]);

  return { total, page, limit: take, logs };
}

module.exports = {
  logSecurityEvent,
  getAuditLogs
};
