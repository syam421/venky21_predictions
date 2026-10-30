const prisma = require('../database/prisma');
const { checkSubscriptionStatus } = require('../services/subscriptionService');
const { revokeDeviceSession } = require('../services/deviceService');

async function getUserProfile(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        phoneNumber: true,
        role: true,
        accountStatus: true,
        createdAt: true
      }
    });

    const subStatus = await checkSubscriptionStatus(user.id);

    return res.json({
      success: true,
      user,
      subscription: {
        isActive: subStatus.isActive,
        expiresAt: subStatus.subscription ? subStatus.subscription.expiresAt : null,
        daysRemaining: subStatus.daysRemaining || 0,
        amount: 1500,
        currency: 'INR'
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getUserDevices(req, res, next) {
  try {
    const devices = await prisma.deviceSession.findMany({
      where: {
        userId: req.user.id,
        status: 'ACTIVE'
      },
      orderBy: { lastActiveAt: 'desc' },
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
      maxDevices: 2,
      devices: devices.map(d => ({
        id: d.id,
        deviceLabel: d.deviceLabel,
        firstRegisteredAt: d.firstRegisteredAt,
        lastActiveAt: d.lastActiveAt,
        isCurrent: d.sessionId === req.sessionId
      }))
    });
  } catch (err) {
    next(err);
  }
}

async function revokeOwnDevice(req, res, next) {
  try {
    const { deviceId } = req.params;

    const device = await prisma.deviceSession.findFirst({
      where: {
        id: deviceId,
        userId: req.user.id
      }
    });

    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }

    await revokeDeviceSession({
      deviceId,
      actorId: req.user.id,
      isRevokedByAdmin: false
    });

    return res.json({
      success: true,
      message: 'Device session revoked successfully.'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getUserProfile,
  getUserDevices,
  revokeOwnDevice
};
