const lotteryService = require('../services/lotteryService');

async function getCurrentPrediction(req, res, next) {
  try {
    const currentState = lotteryService.getCurrentState();

    return res.json({
      success: true,
      data: {
        period: currentState.period || 'LOADING...',
        prediction: currentState.prediction || '...',
        oppositeNumbers: currentState.oppositeNumbers || [],
        lastConfirmedResult: currentState.lastConfirmedResult,
        isStale: currentState.isStale,
        lastSuccessfulFetch: currentState.lastSuccessfulFetch,
        fetchError: currentState.fetchError ? 'Upstream data temporarily delayed' : null,
        disclaimer: 'Predictions are based on statistical probability analysis of past historical draws. Lottery outcomes are inherently probabilistic and cannot be guaranteed.'
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getPredictionHistory(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const history = await lotteryService.getRecentHistory(limit);

    const formatted = history.map(item => ({
      id: item.id,
      issueId: item.issueId,
      shortPeriod: item.issueId.length > 3 ? item.issueId.slice(-3) : item.issueId,
      prediction: item.prediction,
      actualNumber: item.actualNumber,
      actualCategory: item.actualCategory,
      evaluationStatus: item.evaluationStatus,
      isJackpot: item.isJackpot,
      evaluatedAt: item.evaluatedAt
    }));

    return res.json({
      success: true,
      history: formatted
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCurrentPrediction,
  getPredictionHistory
};
