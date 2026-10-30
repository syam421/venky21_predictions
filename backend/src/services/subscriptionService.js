const prisma = require('../database/prisma');
const env = require('../config/env');
const { logSecurityEvent } = require('./auditService');

/**
 * Calculates expiry date.
 * If user already has an active future expiration date, extends from that date!
 * Otherwise calculates from current time.
 */
function calculateExpiryDate(startDate, durationDays = 30) {
  const base = new Date(startDate);
  const expiry = new Date(base.getTime() + durationDays * 24 * 60 * 60 * 1000);
  return expiry;
}

/**
 * Creates or extends a subscription for a user.
 * Must be executed transactionally.
 */
async function grantOrExtendSubscription({
  userId,
  adminId,
  durationDays = env.SUBSCRIPTION_DURATION_DAYS,
  amount = env.SUBSCRIPTION_PRICE_INR,
  currency = 'INR',
  paymentStatus = 'PAID',
  notes = null
}) {
  const now = new Date();

  // Find latest subscription for user
  const latestSub = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { expiresAt: 'desc' }
  });

  let startDate = now;
  // If active and expires in future, extend from current expiration
  if (latestSub && new Date(latestSub.expiresAt) > now && latestSub.status === 'ACTIVE') {
    startDate = new Date(latestSub.expiresAt);
  }

  const expiresAt = calculateExpiryDate(startDate, durationDays);

  const newSub = await prisma.subscription.create({
    data: {
      userId,
      startAt: startDate,
      expiresAt,
      amount,
      currency,
      status: 'ACTIVE',
      paymentStatus,
      createdByAdminId: adminId,
      notes
    }
  });

  await logSecurityEvent({
    eventType: latestSub ? 'SUBSCRIPTION_EXTENDED' : 'SUBSCRIPTION_ACTIVATED',
    actorId: adminId,
    targetUserId: userId,
    details: {
      subscriptionId: newSub.id,
      durationDays,
      amount,
      currency,
      expiresAt: newSub.expiresAt
    }
  });

  return newSub;
}

/**
 * Checks if a user has an active, unexpired subscription
 */
async function checkSubscriptionStatus(userId) {
  const now = new Date();

  const activeSub = await prisma.subscription.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      expiresAt: { gt: now }
    },
    orderBy: { expiresAt: 'desc' }
  });

  if (!activeSub) {
    // If there were expired active subs, mark them EXPIRED
    await prisma.subscription.updateMany({
      where: {
        userId,
        status: 'ACTIVE',
        expiresAt: { lte: now }
      },
      data: { status: 'EXPIRED' }
    });

    return {
      isActive: false,
      subscription: null,
      message: 'Subscription has expired. Please contact administrator to renew.'
    };
  }

  const msRemaining = new Date(activeSub.expiresAt).getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));

  return {
    isActive: true,
    subscription: activeSub,
    daysRemaining,
    expiresAt: activeSub.expiresAt
  };
}

module.exports = {
  calculateExpiryDate,
  grantOrExtendSubscription,
  checkSubscriptionStatus
};
