const prisma = require('./prisma');
const env = require('../config/env');
const { hashPassword } = require('../services/authService');
const { normalizePhoneNumber } = require('../validators/inputValidators');
const { logSecurityEvent } = require('../services/auditService');

async function seedInitialAdmin() {
  const phone = normalizePhoneNumber(env.ADMIN_INITIAL_PHONE);
  const password = env.ADMIN_INITIAL_PASSWORD;

  if (!phone || !password) {
    console.error('Seed Error: ADMIN_INITIAL_PHONE and ADMIN_INITIAL_PASSWORD must be configured.');
    return;
  }

  const passwordHash = await hashPassword(password);

  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });

  if (existingAdmin) {
    const updated = await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        phoneNumber: phone,
        passwordHash,
        accountStatus: 'ACTIVE',
        mustChangePassword: false
      }
    });
    console.log(`[BOOTSTRAP] Administrator credentials updated successfully for phone: ${phone}`);
    return updated;
  }

  const admin = await prisma.user.create({
    data: {
      phoneNumber: phone,
      passwordHash,
      role: 'ADMIN',
      accountStatus: 'ACTIVE',
      mustChangePassword: false,
      notes: 'Initial bootstrap administrator account'
    }
  });

  await logSecurityEvent({
    eventType: 'ADMIN_BOOTSTRAP_INITIALIZED',
    actorId: admin.id,
    targetUserId: admin.id,
    details: { phoneNumber: admin.phoneNumber }
  });

  console.log(`[BOOTSTRAP] Administrator initialized successfully for phone: ${phone}`);
  return admin;
}

if (require.main === module) {
  seedInitialAdmin()
    .catch((e) => {
      console.error('Seed failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { seedInitialAdmin };
