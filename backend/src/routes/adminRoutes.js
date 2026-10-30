const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

// ALL administrative routes strictly require authentication and ADMIN role!
router.use(requireAuth, requireAdmin);

router.get('/stats', getAdminStats);
router.get('/users', listUsers);
router.post('/users', createUser);
router.post('/users/:userId/suspend', suspendUser);
router.post('/users/:userId/activate', activateUser);
router.post('/users/:userId/reset-password', resetUserPassword);
router.post('/users/:userId/subscription', extendSubscription);
router.get('/users/:userId/devices', getUserDevices);
router.delete('/devices/:deviceId', revokeDevice);
router.get('/audit-logs', getAuditLogsController);

module.exports = router;
