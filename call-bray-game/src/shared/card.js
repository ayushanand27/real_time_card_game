/**
 * Represents a playing card in the Call Bray game
 */
export class Card {
  static SUITS = ['♠', '♥', '♦', '♣'];
  static RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

  /**
   * Create a new card
   * @param {string} suit - The card's suit (♠, ♥, ♦, ♣)
   * @param {string} rank - The card's rank (2-10, J, Q, K, A)
   * @param {boolean} [isLastCard=false] - Whether this is the last card dealt
   */
  constructor(suit, rank, isLastCard = false) {
    if (!Card.SUITS.includes(suit)) {
      throw new Error(`Invalid suit: ${suit}`);
    }
    if (!Card.RANKS.includes(rank)) {
      throw new Error(`Invalid rank: ${rank}`);
    }

    this.suit = suit;
    this.rank = rank;
    this.isLastCard = isLastCard;
    this.value = Card.RANKS.indexOf(rank);
  }

  /**
   * Create and shuffle a new deck of cards
   * @returns {Card[]} A shuffled deck of cards
   */
  static createDeck() {
    const deck = [];
    Card.SUITS.forEach(suit => {
      Card.RANKS.forEach(rank => {
        deck.push(new Card(suit, rank));
      });
    });
    
    // Shuffle and mark last card
    const shuffled = Card.shuffle(deck);
    shuffled[shuffled.length - 1].isLastCard = true;
    
    return shuffled;
  }

  /**
   * Shuffle an array of cards using Fisher-Yates algorithm
   * @param {Card[]} deck - Array of cards to shuffle
   * @returns {Card[]} Shuffled array of cards
   */
  static shuffle(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Deal cards to players
   * @param {Card[]} deck - Deck to deal from
   * @param {number} numPlayers - Number of players
   * @param {number} cardsPerPlayer - Cards per player
   * @returns {Card[][]} Array of player hands
   */
  static dealCards(deck, numPlayers, cardsPerPlayer) {
    if (numPlayers * cardsPerPlayer > deck.length) {
      throw new Error('Not enough cards in deck');
    }

    const hands = Array(numPlayers).fill().map(() => []);
    for (let i = 0; i < cardsPerPlayer; i++) {
      for (let j = 0; j < numPlayers; j++) {
        hands[j].push(deck[i * numPlayers + j]);
      }
    }
    return hands;
  }

  /**
   * Check if this card beats another in a trick
   * @param {Card} otherCard - Card to compare against
   * @param {string} ledSuit - Suit that was led
   * @param {string} [trumpSuit] - Trump suit if any
   * @returns {boolean} True if this card wins
   */
  beats(otherCard, ledSuit, trumpSuit = null) {
    // Last card power rule
    if (this.isLastCard) return true;
    if (otherCard.isLastCard) return false;

    // Trump suit rules
    if (trumpSuit) {
      if (this.suit === trumpSuit && otherCard.suit !== trumpSuit) return true;
      if (this.suit !== trumpSuit && otherCard.suit === trumpSuit) return false;
      if (this.suit === trumpSuit && otherCard.suit === trumpSuit) {
        return this.value > otherCard.value;
      }
    }

    // Normal trick rules
    if (this.suit === ledSuit && otherCard.suit !== ledSuit) return true;
    if (this.suit !== ledSuit && otherCard.suit === ledSuit) return false;
    
    // Same suit comparison
    if (this.suit === otherCard.suit) {
      return this.value > otherCard.value;
    }

    // Different non-led suits
    return this.suit === ledSuit;
  }

  /**
   * Check if a card can be legally played
   * @param {Card[]} hand - Player's current hand
   * @param {string} ledSuit - Suit that was led
   * @returns {boolean} True if card can be played
   */
  canPlay(hand, ledSuit) {
    // First card or has no cards of led suit
    if (!ledSuit || !hand.some(card => card.suit === ledSuit)) {
      return true;
    }
    // Must follow suit if possible
    return this.suit === ledSuit;
  }

  /**
   * Convert card to string representation
   * @returns {string} String representation of card
   */
  toString() {
    return `${this.suit}${this.rank}${this.isLastCard ? '*' : ''}`;
  }

  /**
   * Create a card from a string representation
   * @param {string} str - String representation of card
   * @returns {Card} New card instance
   */
  static fromString(str) {
    const isLast = str.endsWith('*');
    const suit = str[0];
    const rank = str.slice(1, isLast ? -1 : undefined);
    return new Card(suit, rank, isLast);
  }
}