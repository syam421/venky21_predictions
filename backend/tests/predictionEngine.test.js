const test = require('node:test');
const assert = require('node:assert/strict');
const {
  B_POOL,
  S_POOL,
  classifyNumber,
  calculateNextPeriod,
  calculateNextPrediction,
  selectOppositeNumbers,
  evaluatePrediction
} = require('../src/services/predictionEngine');

test('Original Rule 1: B_POOL and S_POOL definitions match original source', () => {
  assert.deepEqual([...B_POOL], [5, 6, 7, 8, 9]);
  assert.deepEqual([...S_POOL], [0, 1, 2, 3, 4]);
});

test('Original Rule 2: Classification rules (>= 5 is BIG, < 5 is SMALL)', () => {
  // Numbers 0-4 are SMALL
  for (let n = 0; n <= 4; n++) {
    assert.equal(classifyNumber(n), 'SMALL');
    assert.equal(classifyNumber(String(n)), 'SMALL');
  }
  // Numbers 5-9 are BIG
  for (let n = 5; n <= 9; n++) {
    assert.equal(classifyNumber(n), 'BIG');
    assert.equal(classifyNumber(String(n)), 'BIG');
  }
});

test('Original Rule 3: Last 5 results majority rule (> 2 BIGs = BIG, else SMALL)', () => {
  // Case A: 3 BIGs, 2 SMALLs -> > 2 BIGs -> "BIG"
  const historyCaseA = [
    { number: '7' }, // BIG
    { number: '6' }, // BIG
    { number: '2' }, // SMALL
    { number: '9' }, // BIG
    { number: '1' }  // SMALL
  ];
  const predA = calculateNextPrediction(historyCaseA);
  assert.equal(predA.bigCount, 3);
  assert.equal(predA.prediction, 'BIG');
  assert.deepEqual(predA.last5, ['BIG', 'BIG', 'SMALL', 'BIG', 'SMALL']);

  // Case B: 2 BIGs, 3 SMALLs -> not > 2 -> "SMALL"
  const historyCaseB = [
    { number: '3' }, // SMALL
    { number: '5' }, // BIG
    { number: '1' }, // SMALL
    { number: '0' }, // SMALL
    { number: '8' }  // BIG
  ];
  const predB = calculateNextPrediction(historyCaseB);
  assert.equal(predB.bigCount, 2);
  assert.equal(predB.prediction, 'SMALL');

  // Case C: 5 BIGs -> "BIG"
  const historyCaseC = [
    { number: '9' }, { number: '8' }, { number: '7' }, { number: '6' }, { number: '5' }
  ];
  assert.equal(calculateNextPrediction(historyCaseC).prediction, 'BIG');

  // Case D: 0 BIGs (all SMALL) -> "SMALL"
  const historyCaseD = [
    { number: '0' }, { number: '1' }, { number: '2' }, { number: '3' }, { number: '4' }
  ];
  assert.equal(calculateNextPrediction(historyCaseD).prediction, 'SMALL');
});

test('Original Rule 4: Period number calculation with BigInt + 1n', () => {
  const issue = '20261030100010953';
  const nextPeriod = calculateNextPeriod(issue);
  assert.equal(nextPeriod, '20261030100010954');
});

test('Original Rule 5: Opposite number pool selection behavior', () => {
  // When prediction is BIG, pool is S_POOL ([0,1,2,3,4])
  const oppsWhenBig = selectOppositeNumbers('BIG');
  assert.equal(oppsWhenBig.length, 2);
  oppsWhenBig.forEach(num => {
    assert.ok(S_POOL.includes(num), `Expected ${num} to be in S_POOL`);
  });

  // When prediction is SMALL, pool is B_POOL ([5,6,7,8,9])
  const oppsWhenSmall = selectOppositeNumbers('SMALL');
  assert.equal(oppsWhenSmall.length, 2);
  oppsWhenSmall.forEach(num => {
    assert.ok(B_POOL.includes(num), `Expected ${num} to be in B_POOL`);
  });
});

test('Original Rule 6: Success and failure evaluation rules', () => {
  // Prediction: BIG, Opposites: [1, 3], Actual: 7 (BIG) -> Win by prediction
  const eval1 = evaluatePrediction({ lastPred: 'BIG', lastOpps: [1, 3], actualNum: 7 });
  assert.equal(eval1.isWin, true);
  assert.equal(eval1.isJackpot, false);

  // Prediction: BIG, Opposites: [1, 3], Actual: 3 (SMALL, but in Opposites) -> Win by opposite (Jackpot)
  const eval2 = evaluatePrediction({ lastPred: 'BIG', lastOpps: [1, 3], actualNum: 3 });
  assert.equal(eval2.isWin, true);
  assert.equal(eval2.isJackpot, true);
  assert.equal(eval2.statusText, 'JACKPOT WIN');

  // Prediction: BIG, Opposites: [1, 3], Actual: 0 (SMALL, not in Opposites) -> Loss
  const eval3 = evaluatePrediction({ lastPred: 'BIG', lastOpps: [1, 3], actualNum: 0 });
  assert.equal(eval3.isWin, false);
  assert.equal(eval3.isJackpot, false);
  assert.equal(eval3.statusText, 'LOSS');
});
