import { calculateScore } from './bid-ui';

/**
 * @typedef {'WAITING' | 'DEALING' | 'BIDDING' | 'PLAYING' | 'ENDED'} GamePhase
 * 
 * @typedef {Object} Player
 * @property {string} id
 * @property {Card[]} hand
 * @property {Object} bid
 * @property {number} tricksWon
 */

/**
 * @typedef {Object} Card
 * @property {string} suit
 * @property {string} rank
 * @property {boolean} [isLast]
 */

/**
 * @typedef {Object} GameState
 * @property {GamePhase} phase
 * @property {Player[]} players
 * @property {Card[]} currentTrick
 * @property {Map<string, number>} scores
 * @property {string} currentPlayerId
 * @property {Card} lastCardPlayed
 */

class Game {
  constructor() {
    /** @type {GameState} */
    this.state = {
      phase: 'WAITING',
      players: [],
      currentTrick: [],
      scores: new Map(),
      currentPlayerId: null,
      lastCardPlayed: null
    };

    this.ws = null;
    this.eventHandlers = new Map();
    this.reconnectTimer = null;
  }

  /**
   * Initialize WebSocket connection with auto-reconnect
   * @param {string} gameId 
   * @param {string} playerId
   */
  connect(gameId, playerId) {
    const wsUrl = `ws://localhost:8080`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.ws.send(JSON.stringify({
        event: 'JOIN',
        gameId,
        playerId
      }));
      
      // Start heartbeat
      setInterval(() => {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ event: 'PING' }));
        }
      }, 30000);
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleServerMessage(message);
    };

    this.ws.onclose = () => {
      if (!this.reconnectTimer) {
        this.reconnectTimer = setTimeout(() => {
          this.connect(gameId, playerId);
          this.reconnectTimer = null;
        }, 5000);
      }
    };
  }

  /**
   * Handle incoming server messages
   * @param {Object} message 
   */
  handleServerMessage(message) {
    const { event, payload } = message;

    switch (event) {
      case 'GAME_START':
        this.state.phase = 'DEALING';
        this.state.players = payload.players;
        break;

      case 'PHASE_CHANGE':
        this.state.phase = payload.phase;
        if (payload.bids) {
          this.updateBids(payload.bids);
        }
        break;

      case 'CARD_PLAYED':
        this.state.currentTrick.push(payload);
        this.state.lastCardPlayed = payload.card;
        break;

      case 'TRICK_COMPLETE':
        this.state.scores = new Map(Object.entries(payload.scores));
        this.state.currentTrick = [];
        break;
    }

    // Notify subscribers
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => handler(payload));
  }

  /**
   * Subscribe to game events
   * @param {string} event 
   * @param {Function} handler 
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  /**
   * Submit a bid
   * @param {Object} bid 
   */
  submitBid(bid) {
    if (this.state.phase !== 'BIDDING') return;
    
    this.ws.send(JSON.stringify({
      event: 'BID',
      payload: bid
    }));
  }

  /**
   * Play a card
   * @param {Card} card 
   */
  playCard(card) {
    if (this.state.phase !== 'PLAYING') return;

    this.ws.send(JSON.stringify({
      event: 'PLAY',
      payload: { card }
    }));
  }

  /**
   * Update bids when all players have bid
   * @param {Object} bids 
   */
  updateBids(bids) {
    this.state.players.forEach(player => {
      player.bid = bids[player.id];
    });
  }

  /**
   * Check if a card can be played
   * @param {Card} card 
   * @returns {boolean}
   */
  isValidPlay(card) {
    if (this.state.phase !== 'PLAYING') return false;
    
    // First card of trick can be anything
    if (this.state.currentTrick.length === 0) return true;
    
    const leadSuit = this.state.currentTrick[0].card.suit;
    const playerHand = this.state.players.find(
      p => p.id === this.state.currentPlayerId
    ).hand;
    
    // Must follow suit if possible
    if (card.suit !== leadSuit) {
      return !playerHand.some(c => c.suit === leadSuit);
    }
    
    return true;
  }
}

export const game = new Game();
