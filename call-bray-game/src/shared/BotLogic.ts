/**
 * AI Bot Logic for Call Bray Card Game
 * Implements strategic decision-making for different difficulty levels
 */

// Type definitions
interface Card {
  suit: string;
  rank: string;
  value: number;
}

interface Bid {
  type: 'normal' | 'nil' | 'blind';
  n: number;
  tricksWon: number;
}

interface GameState {
  currentSuit?: string;
  playedCards: Card[];
  roundNumber: number;
  playerPosition: number;
  otherBids: Bid[];
}

interface BotConfig {
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  riskTolerance: number; // 0-1
  aggressionLevel: number; // 0-1
  memoryDepth: number; // How many rounds to remember
}

/**
 * Main Bot Class
 */
export class BrayBot {
  private config: BotConfig;
  private gameHistory: GameState[] = [];
  private personality: BotPersonality;

  constructor(config: BotConfig) {
    this.config = config;
    this.personality = new BotPersonality(config);
  }

  /**
   * Main decision method for bidding
   */
  decideBid(hand: Card[], gameState: GameState): Bid {
    this.updateGameHistory(gameState);
    
    const analysis = this.analyzeHand(hand, gameState);
    const riskAssessment = this.assessRisk(hand, gameState);
    
    // Determine bid type based on difficulty and analysis
    const bidType = this.chooseBidType(analysis, riskAssessment);
    
    // Calculate optimal bid amount
    const bidAmount = this.calculateBidAmount(bidType, analysis, riskAssessment);
    
    return {
      type: bidType,
      n: bidAmount,
      tricksWon: 0
    };
  }

  /**
   * Analyze hand strength and potential
   */
  private analyzeHand(hand: Card[], gameState: GameState): HandAnalysis {
    const suitCounts = this.countSuits(hand);
    const highCards = this.countHighCards(hand);
    const potentialTricks = this.estimatePotentialTricks(hand, gameState);
    const lastCardPower = this.assessLastCardPower(hand, gameState);
    
    return {
      totalCards: hand.length,
      suitCounts,
      highCards,
      potentialTricks,
      lastCardPower,
      averageCardValue: this.calculateAverageValue(hand),
      trumpStrength: this.calculateTrumpStrength(hand, gameState.currentSuit)
    };
  }

  /**
   * Count cards by suit
   */
  private countSuits(hand: Card[]): Record<string, number> {
    const counts: Record<string, number> = { '♠': 0, '♥': 0, '♦': 0, '♣': 0 };
    hand.forEach(card => {
      counts[card.suit]++;
    });
    return counts;
  }

  /**
   * Count high-value cards (A, K, Q, J)
   */
  private countHighCards(hand: Card[]): number {
    const highRanks = ['A', 'K', 'Q', 'J'];
    return hand.filter(card => highRanks.includes(card.rank)).length;
  }

  /**
   * Estimate potential tricks based on hand strength
   */
  private estimatePotentialTricks(hand: Card[], gameState: GameState): number {
    let potential = 0;
    
    // Base potential from high cards
    const highCards = this.countHighCards(hand);
    potential += highCards * 0.7; // 70% chance per high card
    
    // Trump suit advantage
    if (gameState.currentSuit) {
      const trumpCards = hand.filter(card => card.suit === gameState.currentSuit);
      potential += trumpCards.length * 0.5;
    }
    
    // Last card power bonus
    const lastCard = hand[hand.length - 1];
    if (this.isLastCardPower(lastCard, gameState.currentSuit)) {
      potential += 1.5;
    }
    
    // Adjust based on hand size
    potential *= (hand.length / 13); // Normalize to 13-card hand
    
    return Math.min(potential, hand.length);
  }

  /**
   * Assess last card power
   */
  private assessLastCardPower(hand: Card[], currentSuit?: string): boolean {
    if (hand.length === 0) return false;
    const lastCard = hand[hand.length - 1];
    return this.isLastCardPower(lastCard, currentSuit);
  }

  /**
   * Check if card has last card power
   */
  private isLastCardPower(card: Card, currentSuit?: string): boolean {
    if (!card) return false;
    
    // Ace always has power
    if (card.rank === 'A') return true;
    
    // Trump suit cards have power
    if (currentSuit && card.suit === currentSuit) return true;
    
    // High cards in long suits
    const highRanks = ['K', 'Q', 'J'];
    return highRanks.includes(card.rank);
  }

  /**
   * Calculate average card value
   */
  private calculateAverageValue(hand: Card[]): number {
    if (hand.length === 0) return 0;
    const total = hand.reduce((sum, card) => sum + card.value, 0);
    return total / hand.length;
  }

  /**
   * Calculate trump strength
   */
  private calculateTrumpStrength(hand: Card[], trumpSuit?: string): number {
    if (!trumpSuit) return 0;
    
    const trumpCards = hand.filter(card => card.suit === trumpSuit);
    return trumpCards.reduce((strength, card) => {
      return strength + card.value;
    }, 0);
  }

  /**
   * Assess risk level for different bid types
   */
  private assessRisk(hand: Card[], gameState: GameState): RiskAssessment {
    const analysis = this.analyzeHand(hand, gameState);
    const otherBids = gameState.otherBids || [];
    
    // Calculate total bids so far
    const totalBids = otherBids.reduce((sum, bid) => sum + bid.n, 0);
    const remainingCards = 52 - gameState.playedCards.length;
    const cardsPerPlayer = remainingCards / 4;
    
    // Risk of overbidding
    const overbidRisk = totalBids > cardsPerPlayer ? 0.8 : 0.2;
    
    // Risk of underbidding
    const underbidRisk = analysis.potentialTricks > totalBids ? 0.3 : 0.7;
    
    // Nil bid risk
    const nilRisk = analysis.highCards > 2 ? 0.9 : 0.1;
    
    // Blind bid risk
    const blindRisk = analysis.potentialTricks < 7 ? 0.95 : 0.3;
    
    return {
      overbidRisk,
      underbidRisk,
      nilRisk,
      blindRisk,
      overallRisk: (overbidRisk + underbidRisk + nilRisk + blindRisk) / 4
    };
  }

  /**
   * Choose bid type based on analysis and personality
   */
  private chooseBidType(analysis: HandAnalysis, risk: RiskAssessment): 'normal' | 'nil' | 'blind' {
    const personality = this.personality;
    
    // Expert bots can use all bid types
    if (this.config.difficulty === 'expert') {
      // Nil bid logic
      if (analysis.highCards <= 1 && analysis.averageCardValue < 8) {
        if (risk.nilRisk < 0.3) return 'nil';
      }
      
      // Blind bid logic
      if (analysis.potentialTricks >= 7 && analysis.lastCardPower) {
        if (risk.blindRisk < 0.4 && personality.aggressionLevel > 0.7) {
          return 'blind';
        }
      }
    }
    
    // Medium and hard bots can use nil bids
    if (this.config.difficulty >= 'medium') {
      if (analysis.highCards === 0 && analysis.averageCardValue < 6) {
        if (risk.nilRisk < 0.2) return 'nil';
      }
    }
    
    // Default to normal bid
    return 'normal';
  }

  /**
   * Calculate optimal bid amount
   */
  private calculateBidAmount(
    bidType: string, 
    analysis: HandAnalysis, 
    risk: RiskAssessment
  ): number {
    if (bidType === 'nil') return 0;
    if (bidType === 'blind') return Math.max(7, Math.floor(analysis.potentialTricks));
    
    // Normal bid calculation
    let baseAmount = Math.floor(analysis.potentialTricks);
    
    // Adjust based on personality
    const personality = this.personality;
    if (personality.aggressionLevel > 0.7) {
      baseAmount += 1;
    } else if (personality.aggressionLevel < 0.3) {
      baseAmount = Math.max(0, baseAmount - 1);
    }
    
    // Adjust based on risk tolerance
    if (risk.overallRisk > 0.7) {
      baseAmount = Math.max(0, baseAmount - 1);
    }
    
    // Ensure minimum bid for blind
    if (bidType === 'blind') {
      return Math.max(7, baseAmount);
    }
    
    return Math.max(0, Math.min(baseAmount, analysis.totalCards));
  }

  /**
   * Update game history for learning
   */
  private updateGameHistory(gameState: GameState): void {
    this.gameHistory.push({ ...gameState });
    
    // Keep only recent history based on memory depth
    if (this.gameHistory.length > this.config.memoryDepth) {
      this.gameHistory.shift();
    }
  }

  /**
   * Get bot personality for decision making
   */
  getPersonality(): BotPersonality {
    return this.personality;
  }

  /**
   * Reset bot state for new game
   */
  reset(): void {
    this.gameHistory = [];
  }
}

/**
 * Bot Personality Class
 */
class BotPersonality {
  public riskTolerance: number;
  public aggressionLevel: number;
  public bluffingTendency: number;
  public learningRate: number;

  constructor(config: BotConfig) {
    this.riskTolerance = config.riskTolerance;
    this.aggressionLevel = config.aggressionLevel;
    this.bluffingTendency = this.calculateBluffingTendency(config);
    this.learningRate = this.calculateLearningRate(config);
  }

  private calculateBluffingTendency(config: BotConfig): number {
    // Higher difficulty = more bluffing
    const difficultyMultiplier = {
      'easy': 0.1,
      'medium': 0.3,
      'hard': 0.6,
      'expert': 0.8
    };
    
    return difficultyMultiplier[config.difficulty] * config.aggressionLevel;
  }

  private calculateLearningRate(config: BotConfig): number {
    // Higher difficulty = faster learning
    const difficultyMultiplier = {
      'easy': 0.1,
      'medium': 0.3,
      'hard': 0.6,
      'expert': 0.9
    };
    
    return difficultyMultiplier[config.difficulty];
  }
}

/**
 * Analysis result interfaces
 */
interface HandAnalysis {
  totalCards: number;
  suitCounts: Record<string, number>;
  highCards: number;
  potentialTricks: number;
  lastCardPower: boolean;
  averageCardValue: number;
  trumpStrength: number;
}

interface RiskAssessment {
  overbidRisk: number;
  underbidRisk: number;
  nilRisk: number;
  blindRisk: number;
  overallRisk: number;
}

/**
 * Bot Factory for creating different difficulty bots
 */
export class BotFactory {
  static createBot(difficulty: 'easy' | 'medium' | 'hard' | 'expert'): BrayBot {
    const configs = {
      easy: {
        difficulty: 'easy' as const,
        riskTolerance: 0.2,
        aggressionLevel: 0.3,
        memoryDepth: 2
      },
      medium: {
        difficulty: 'medium' as const,
        riskTolerance: 0.4,
        aggressionLevel: 0.5,
        memoryDepth: 3
      },
      hard: {
        difficulty: 'hard' as const,
        riskTolerance: 0.6,
        aggressionLevel: 0.7,
        memoryDepth: 5
      },
      expert: {
        difficulty: 'expert' as const,
        riskTolerance: 0.8,
        aggressionLevel: 0.9,
        memoryDepth: 10
      }
    };

    return new BrayBot(configs[difficulty]);
  }
}

/**
 * Bot Performance Tracker
 */
export class BotPerformanceTracker {
  private gamesPlayed = 0;
  private totalScore = 0;
  private bidAccuracy = 0;
  private successfulBids = 0;
  private totalBids = 0;

  recordGame(score: number, bids: Bid[]): void {
    this.gamesPlayed++;
    this.totalScore += score;
    
    bids.forEach(bid => {
      this.totalBids++;
      if (bid.tricksWon === bid.n) {
        this.successfulBids++;
      }
    });
    
    this.bidAccuracy = this.successfulBids / this.totalBids;
  }

  getStats(): BotStats {
    return {
      gamesPlayed: this.gamesPlayed,
      averageScore: this.totalScore / this.gamesPlayed,
      bidAccuracy: this.bidAccuracy,
      successfulBids: this.successfulBids,
      totalBids: this.totalBids
    };
  }

  reset(): void {
    this.gamesPlayed = 0;
    this.totalScore = 0;
    this.bidAccuracy = 0;
    this.successfulBids = 0;
    this.totalBids = 0;
  }
}

interface BotStats {
  gamesPlayed: number;
  averageScore: number;
  bidAccuracy: number;
  successfulBids: number;
  totalBids: number;
} 