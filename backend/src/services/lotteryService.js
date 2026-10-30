const prisma = require('../database/prisma');
const env = require('../config/env');
const {
  classifyNumber,
  calculateNextPeriod,
  calculateNextPrediction,
  selectOppositeNumbers,
  evaluatePrediction
} = require('./predictionEngine');

class LotteryService {
  constructor() {
    this.apiUrl = env.LOTTERY_API_URL;
    this.pollIntervalMs = env.POLL_INTERVAL_MS || 3000;
    this.pollTimer = null;
    this.isPolling = false;

    // In-memory latest state for instant response
    this.state = {
      currentPeriod: null,
      prediction: null,
      oppositeNumbers: [],
      lastIssueNumber: null,
      lastConfirmedResult: null,
      isStale: false,
      lastSuccessfulFetch: null,
      fetchError: null
    };
  }

  async fetchLotteryData() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(this.apiUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Upstream lottery API responded with status ${response.status}`);
      }

      const json = await response.json();
      if (!json || !json.data || !Array.isArray(json.data.list) || json.data.list.length === 0) {
        throw new Error('Upstream lottery API returned invalid or empty data');
      }

      return json.data.list;
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  async processResults(historyList) {
    if (!historyList || historyList.length === 0) return;

    const latest = historyList[0];
    const latestIssue = latest.issueNumber.toString();
    const actualNum = parseInt(latest.number, 10);
    const actualCategory = classifyNumber(actualNum);

    // 1. Calculate prediction for the upcoming period using original logic
    const { prediction, last5 } = calculateNextPrediction(historyList);
    const nextPeriod = calculateNextPeriod(latestIssue);

    // 2. Check if a new issue has concluded
    if (this.state.lastIssueNumber !== latestIssue) {
      const previousIssueNumber = this.state.lastIssueNumber;

      // Check if we had a recorded prediction for this newly arrived issue
      const pendingPrediction = await prisma.prediction.findUnique({
        where: { issueId: latestIssue }
      });

      if (pendingPrediction) {
        const oppsArray = pendingPrediction.oppositeNumbers
          ? pendingPrediction.oppositeNumbers.split(',').map(n => parseInt(n.trim(), 10))
          : [];

        const evalResult = evaluatePrediction({
          lastPred: pendingPrediction.prediction,
          lastOpps: oppsArray,
          actualNum
        });

        await prisma.prediction.update({
          where: { issueId: latestIssue },
          data: {
            actualNumber: actualNum,
            actualCategory,
            evaluationStatus: evalResult.isWin ? 'WIN' : 'LOSS',
            isJackpot: evalResult.isJackpot,
            evaluatedAt: new Date()
          }
        });
      } else {
        // Evaluate against in-memory previous prediction if was tracked
        const lastPred = this.state.prediction || prediction;
        const lastOpps = this.state.oppositeNumbers || [];

        const evalResult = evaluatePrediction({
          lastPred,
          lastOpps,
          actualNum
        });

        // Store evaluation record in database
        await prisma.prediction.upsert({
          where: { issueId: latestIssue },
          update: {
            actualNumber: actualNum,
            actualCategory,
            evaluationStatus: evalResult.isWin ? 'WIN' : 'LOSS',
            isJackpot: evalResult.isJackpot,
            evaluatedAt: new Date()
          },
          create: {
            issueId: latestIssue,
            periodNumber: latestIssue,
            prediction: lastPred,
            oppositeNumbers: lastOpps.join(', '),
            actualNumber: actualNum,
            actualCategory,
            evaluationStatus: evalResult.isWin ? 'WIN' : 'LOSS',
            isJackpot: evalResult.isJackpot,
            evaluatedAt: new Date()
          }
        });
      }

      // Upsert confirmed lottery result
      await prisma.lotteryResult.upsert({
        where: { issueNumber: latestIssue },
        update: {
          number: actualNum,
          category: actualCategory,
          color: latest.color || null
        },
        create: {
          issueNumber: latestIssue,
          number: actualNum,
          category: actualCategory,
          color: latest.color || null,
          rawPayload: JSON.stringify(latest)
        }
      });

      // Update state for latest confirmed issue
      this.state.lastIssueNumber = latestIssue;
      this.state.lastConfirmedResult = {
        issueNumber: latestIssue,
        number: actualNum,
        category: actualCategory,
        color: latest.color || null
      };

      // Select new opposite numbers for next prediction
      const opposites = selectOppositeNumbers(prediction);
      this.state.oppositeNumbers = opposites;
      this.state.prediction = prediction;
      this.state.currentPeriod = nextPeriod;

      // Pre-record prediction for the upcoming period in database
      await prisma.prediction.upsert({
        where: { issueId: nextPeriod },
        update: {
          prediction,
          oppositeNumbers: opposites.join(', ')
        },
        create: {
          issueId: nextPeriod,
          periodNumber: nextPeriod,
          prediction,
          oppositeNumbers: opposites.join(', '),
          evaluationStatus: 'PENDING'
        }
      });
    } else {
      // If same issue but memory state was empty on startup
      if (!this.state.prediction) {
        this.state.prediction = prediction;
        this.state.currentPeriod = nextPeriod;
        this.state.oppositeNumbers = selectOppositeNumbers(prediction);
      }
    }

    this.state.isStale = false;
    this.state.lastSuccessfulFetch = new Date();
    this.state.fetchError = null;
  }

  async poll() {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      const list = await this.fetchLotteryData();
      await this.processResults(list);
    } catch (err) {
      this.state.isStale = true;
      this.state.fetchError = err.message;
    } finally {
      this.isPolling = false;
    }
  }

  start() {
    if (this.pollTimer) return;
    // Initial fetch
    this.poll();
    this.pollTimer = setInterval(() => this.poll(), this.pollIntervalMs);
  }

  stop() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  getCurrentState() {
    return {
      period: this.state.currentPeriod,
      prediction: this.state.prediction,
      oppositeNumbers: this.state.oppositeNumbers,
      lastConfirmedResult: this.state.lastConfirmedResult,
      isStale: this.state.isStale,
      lastSuccessfulFetch: this.state.lastSuccessfulFetch,
      fetchError: this.state.fetchError
    };
  }

  async getRecentHistory(limit = 20) {
    return await prisma.prediction.findMany({
      where: {
        evaluationStatus: { in: ['WIN', 'LOSS'] }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }
}

const lotteryService = new LotteryService();

module.exports = lotteryService;
