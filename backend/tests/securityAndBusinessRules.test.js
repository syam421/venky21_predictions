const test = require('node:test');
const assert = require('node:assert/strict');
const prisma = require('../src/database/prisma');
const { hashPassword, comparePassword, loginUser } = require('../src/services/authService');
const { grantOrExtendSubscription, checkSubscriptionStatus, calculateExpiryDate } = require('../src/services/subscriptionService');
const { registerDeviceSession, revokeDeviceSession } = require('../src/services/deviceService');

test('Security Rule 1: Password hashing uses secure salt and verifies correctly', async () => {
  const plain = 'StrongPass2026!';
  const hash = await hashPassword(plain);

  assert.notEqual(hash, plain);
  assert.ok(hash.startsWith('$2')); // bcrypt identifier

  const isMatch = await comparePassword(plain, hash);
  assert.equal(isMatch, true);

  const isWrong = await comparePassword('WrongPassword', hash);
  assert.equal(isWrong, false);
});

test('Subscription Rule 1: Correct 30-day calculation and status check', async () => {
  const start = new Date('2026-01-10T12:00:00Z');
  const expiry = calculateExpiryDate(start, 30);

  const diffMs = expiry.getTime() - start.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  assert.equal(diffDays, 30);
});

test('Device Rule 1: Strict enforcement of maximum 2 active devices per user', async () => {
  // Create a temporary test user
  const testPhone = '9991112233';
  await prisma.deviceSession.deleteMany({ where: { user: { phoneNumber: testPhone } } });
  await prisma.subscription.deleteMany({ where: { user: { phoneNumber: testPhone } } });
  await prisma.user.deleteMany({ where: { phoneNumber: testPhone } });

  const pwdHash = await hashPassword('TestDevicePass123!');
  const user = await prisma.user.create({
    data: {
      phoneNumber: testPhone,
      passwordHash: pwdHash,
      role: 'USER',
      accountStatus: 'ACTIVE'
    }
  });

  // Grant active subscription
  await grantOrExtendSubscription({
    userId: user.id,
    adminId: user.id,
    durationDays: 30
  });

  // Device 1: Register
  const dev1 = await registerDeviceSession({
    userId: user.id,
    sessionId: 'session_device_1',
    deviceLabel: 'Device 1 (Chrome)'
  });
  assert.equal(dev1.success, true);
  assert.equal(dev1.activeCount, 1);

  // Device 2: Register
  const dev2 = await registerDeviceSession({
    userId: user.id,
    sessionId: 'session_device_2',
    deviceLabel: 'Device 2 (Firefox)'
  });
  assert.equal(dev2.success, true);
  assert.equal(dev2.activeCount, 2);

  // Device 3: Should be REJECTED!
  const dev3 = await registerDeviceSession({
    userId: user.id,
    sessionId: 'session_device_3',
    deviceLabel: 'Device 3 (Mobile Safari)'
  });
  assert.equal(dev3.success, false);
  assert.equal(dev3.code, 'DEVICE_LIMIT_REACHED');

  // Now revoke Device 1
  await revokeDeviceSession({
    deviceId: dev1.session.id,
    actorId: user.id
  });

  // Device 3: Should now succeed because Device 1 was revoked!
  const dev3Retry = await registerDeviceSession({
    userId: user.id,
    sessionId: 'session_device_3',
    deviceLabel: 'Device 3 (Mobile Safari)'
  });
  assert.equal(dev3Retry.success, true);
  assert.equal(dev3Retry.activeCount, 2);

  // Cleanup test user
  await prisma.deviceSession.deleteMany({ where: { userId: user.id } });
  await prisma.subscription.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
});

test('Account Status Rule 1: Suspended user is blocked from logging in', async () => {
  const testPhone = '9998887766';
  await prisma.user.deleteMany({ where: { phoneNumber: testPhone } });

  const pwdHash = await hashPassword('SuspendedUserPass123!');
  const user = await prisma.user.create({
    data: {
      phoneNumber: testPhone,
      passwordHash: pwdHash,
      role: 'USER',
      accountStatus: 'SUSPENDED'
    }
  });

  await assert.rejects(
    async () => {
      await loginUser({
        phoneNumber: testPhone,
        password: 'SuspendedUserPass123!'
      });
    },
    (err) => {
      assert.equal(err.status, 403);
      assert.ok(err.message.includes('suspended'));
      return true;
    }
  );

  // Cleanup
  await prisma.user.delete({ where: { id: user.id } });
});
