const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  getUserDevices,
  revokeOwnDevice
} = require('../controllers/userController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/profile', getUserProfile);
router.get('/devices', getUserDevices);
router.delete('/devices/:deviceId', revokeOwnDevice);

module.exports = router;
