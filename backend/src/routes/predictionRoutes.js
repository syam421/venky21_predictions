const express = require('express');
const router = express.Router();
const {
  getCurrentPrediction,
  getPredictionHistory
} = require('../controllers/predictionController');
const { requireAuth } = require('../middleware/authMiddleware');

// Accessible to authenticated users with active subscription
router.use(requireAuth);

router.get('/current', getCurrentPrediction);
router.get('/history', getPredictionHistory);

module.exports = router;
