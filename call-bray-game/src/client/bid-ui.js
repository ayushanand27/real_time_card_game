let rules;
if (typeof window !== 'undefined') {
  rules = require('../shared/rules.json');
} else {
  // Node.js context: fallback to empty or throw
  rules = {};
}

/**
 * TypeScript interfaces for type safety
 * @typedef {Object} Bid
 * @property {'normal' | 'nil' | 'blind'} type - Type of bid
 * @property {number} n - Number of tricks bid
 * @property {number} tricksWon - Actual tricks won
 */

/**
 * Calculates score based on bid type and performance
 * @param {'normal' | 'nil' | 'blind'} bidType - Type of bid
 * @param {number} bidN - Number of tricks bid
 * @param {number} tricksWon - Actual tricks won
 * @returns {number} Score (positive or negative)
 * @throws {Error} When bidType is invalid
 */
export function calculateScore(bidType, bidN, tricksWon) {
  // Input validation
  if (!['normal', 'nil', 'blind'].includes(bidType)) {
    throw new Error(`Invalid bid type: ${bidType}`);
  }
  
  if (typeof bidN !== 'number' || bidN < 0) {
    throw new Error(`Invalid bid number: ${bidN}`);
  }
  
  if (typeof tricksWon !== 'number' || tricksWon < 0) {
    throw new Error(`Invalid tricks won: ${tricksWon}`);
  }

  switch(bidType) {
    case 'normal':
      return calculateNormalScore(bidN, tricksWon);
      
    case 'nil':
      return tricksWon === 0 ? rules.bids.nil.success : rules.bids.nil.fail;
      
    case 'blind':
      return calculateBlindScore(tricksWon);
      
    default:
      throw new Error(`Unknown bid type: ${bidType}`);
  }
}

/**
 * Calculates score for normal bids
 * @param {number} bidN - Number of tricks bid
 * @param {number} tricksWon - Actual tricks won
 * @returns {number} Score for normal bid
 * @private
 */
function calculateNormalScore(bidN, tricksWon) {
  const diff = tricksWon - bidN;
  
  if (diff === 0) return bidN * rules.bids.normal.base;
  if (diff === 1 || diff === 2) return (bidN * rules.bids.normal.base) + rules.bids.normal.over1;
  if (diff >= 3) return -((bidN + 3) * rules.bids.normal.penalty);
  if (diff === -1) return -10;
  return -(Math.abs(diff) * rules.bids.normal.penalty);
}

/**
 * Calculates score for blind bids
 * @param {number} tricksWon - Actual tricks won
 * @returns {number} Score for blind bid
 * @private
 */
function calculateBlindScore(tricksWon) {
  return tricksWon >= rules.bids.blind.min 
    ? rules.bids.blind.base + (tricksWon - rules.bids.blind.min) * rules.bids.blind.bonusPerTrick
    : 0;
}

/**
 * Validates a bid object against game rules
 * @param {Bid} bid - Bid object to validate
 * @returns {boolean} True if bid is valid
 */
export function validateBid(bid) {
  if (!bid || typeof bid !== 'object') return false;
  if (!['normal', 'nil', 'blind'].includes(bid.type)) return false;
  if (typeof bid.n !== 'number' || bid.n < 0) return false;
  if (typeof bid.tricksWon !== 'number' || bid.tricksWon < 0) return false;
  
  // Nil bids must have n = 0
  if (bid.type === 'nil' && bid.n !== 0) return false;
  
  // Blind bids have special requirements
  if (bid.type === 'blind' && bid.n < rules.bids.blind.min) return false;
  
  return true;
}

/**
 * Calculates team score from multiple bids
 * @param {Bid[]} bids - Array of bid objects
 * @returns {number} Total team score
 */
export function calculateTeamScore(bids) {
  if (!Array.isArray(bids)) {
    throw new Error('Bids must be an array');
  }
  
  return bids.reduce((total, bid) => {
    if (!validateBid(bid)) {
      throw new Error(`Invalid bid: ${JSON.stringify(bid)}`);
    }
    return total + calculateScore(bid.type, bid.n, bid.tricksWon);
  }, 0);
}

/**
 * Memoized version of calculateScore for performance optimization
 * @type {Map<string, number>}
 */
const scoreCache = new Map();

/**
 * Memoized score calculation
 * @param {'normal' | 'nil' | 'blind'} bidType - Type of bid
 * @param {number} bidN - Number of tricks bid
 * @param {number} tricksWon - Actual tricks won
 * @returns {number} Score (positive or negative)
 */
export function calculateScoreMemoized(bidType, bidN, tricksWon) {
  const cacheKey = `${bidType}-${bidN}-${tricksWon}`;
  
  if (scoreCache.has(cacheKey)) {
    return scoreCache.get(cacheKey);
  }
  
  const score = calculateScore(bidType, bidN, tricksWon);
  scoreCache.set(cacheKey, score);
  
  return score;
}

/**
 * Clears the score cache (useful for testing or memory management)
 */
export function clearScoreCache() {
  scoreCache.clear();
}

/**
 * (Debug Tool) Prints score explanation
 */
export function debugScore(bidType, bidN, tricksWon) {
  const score = calculateScore(bidType, bidN, tricksWon);
  console.log(
    `Bid: ${bidType} ${bidN} | Won: ${tricksWon} | Score: ${score}`
  );
  return score;
}