/**
 * VENKY21 — PREDICTION ENGINE
 * 
 * CRITICAL RULE: STRICT PRESERVATION OF ORIGINAL LOGIC
 * Source of truth: VENKY_VIP.html original source code
 * 
 * Rules preserved:
 * 1. B_POOL = [5, 6, 7, 8, 9]
 * 2. S_POOL = [0, 1, 2, 3, 4]
 * 3. Classification: number >= 5 is "BIG", number < 5 is "SMALL"
 * 4. Last 5 results analysis: takes first 5 elements of issue list
 * 5. Majority rule: if count of "BIG" in last 5 > 2 -> "BIG", else -> "SMALL"
 * 6. Opposite pool: if nextPred === "BIG" -> S_POOL, else -> B_POOL
 * 7. Opposite numbers: pick 2 numbers from opposite pool
 * 8. Period calculation: (BigInt(latest.issueNumber) + 1n).toString()
 * 9. Evaluation: isWin = (lastPred === actualSize) || lastOpps.includes(actualNum)
 * 10. Jackpot: lastOpps.includes(actualNum)
 */

const B_POOL = Object.freeze([5, 6, 7, 8, 9]);
const S_POOL = Object.freeze([0, 1, 2, 3, 4]);

/**
 * Classifies a lottery number into "BIG" or "SMALL"
 * @param {number|string} num
 * @returns {"BIG"|"SMALL"}
 */
function classifyNumber(num) {
  const parsed = parseInt(num, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid lottery number: ${num}`);
  }
  return parsed >= 5 ? "BIG" : "SMALL";
}

/**
 * Calculates next period number from latest issueNumber
 * @param {string|number|BigInt} issueNumber
 * @returns {string}
 */
function calculateNextPeriod(issueNumber) {
  if (!issueNumber) return "";
  try {
    return (BigInt(issueNumber.toString().trim()) + 1n).toString();
  } catch (err) {
    throw new Error(`Failed to calculate next period for issue: ${issueNumber}`);
  }
}

/**
 * Predicts the next outcome based on the last 5 results (majority rule)
 * @param {Array<{number: string|number}>} historyList
 * @returns {{"prediction": "BIG"|"SMALL", "last5": Array<"BIG"|"SMALL">}}
 */
function calculateNextPrediction(historyList) {
  if (!Array.isArray(historyList) || historyList.length === 0) {
    throw new Error("Prediction requires a non-empty history list");
  }

  // Original: json.data.list.slice(0, 5).map(x => parseInt(x.number) >= 5 ? "BIG" : "SMALL");
  const last5 = historyList
    .slice(0, 5)
    .map(x => classifyNumber(x.number));

  // Original: last5.filter(x => x === "BIG").length > 2 ? "BIG" : "SMALL";
  const bigCount = last5.filter(x => x === "BIG").length;
  const prediction = bigCount > 2 ? "BIG" : "SMALL";

  return {
    prediction,
    last5,
    bigCount
  };
}

/**
 * Selects 2 opposite numbers from the corresponding opposite pool
 * @param {"BIG"|"SMALL"} nextPred
 * @param {Function} [randomFn] Optional random generator for testing/deterministic seeds
 * @returns {number[]} Array of 2 distinct numbers
 */
function selectOppositeNumbers(nextPred, randomFn = Math.random) {
  const pool = nextPred === "BIG" ? [...S_POOL] : [...B_POOL];

  // Preserves original: pool.sort(() => 0.5 - Math.random()).slice(0, 2);
  const shuffled = pool.sort(() => 0.5 - randomFn());
  return shuffled.slice(0, 2);
}

/**
 * Evaluates a past prediction against the actual confirmed result
 * @param {Object} params
 * @param {"BIG"|"SMALL"} params.lastPred The prediction that was made
 * @param {number[]} params.lastOpps The 2 opposite numbers that were picked
 * @param {number|string} params.actualNum The actual drawn lottery number
 * @returns {{
 *   actualNum: number,
 *   actualSize: "BIG"|"SMALL",
 *   isWin: boolean,
 *   isJackpot: boolean,
 *   statusText: string
 * }}
 */
function evaluatePrediction({ lastPred, lastOpps = [], actualNum }) {
  const num = parseInt(actualNum, 10);
  const actualSize = classifyNumber(num);
  const opps = Array.isArray(lastOpps) ? lastOpps.map(n => parseInt(n, 10)) : [];

  // Original: (lastPred === actualSize) || lastOpps.includes(actualNum);
  const isOppositeHit = opps.includes(num);
  const isWin = (lastPred === actualSize) || isOppositeHit;
  const isJackpot = isOppositeHit;

  const statusText = isWin
    ? (isJackpot ? "JACKPOT WIN" : "WIN")
    : "LOSS";

  return {
    actualNum: num,
    actualSize,
    isWin,
    isJackpot,
    statusText
  };
}

module.exports = {
  B_POOL,
  S_POOL,
  classifyNumber,
  calculateNextPeriod,
  calculateNextPrediction,
  selectOppositeNumbers,
  evaluatePrediction
};
