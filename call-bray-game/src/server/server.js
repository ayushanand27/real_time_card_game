const WebSocket = require('ws');
const { calculateScore, validateBid } = require('../client/bid-ui');
const fs = require('fs');
const path = require('path');
const rules = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../shared/rules.json'), 'utf8')
);

// Game state management
const games = new Map();
const playerConnections = new Map();

// Add after the game state management section
const actionLocks = new Map();
const playerActivity = new Map();
const LOCK_TIMEOUT = 5000;
const PLAYER_TIMEOUT = 30000;

class GameState {
  constructor(id) {
    this.id = id;
    this.phase = 'WAITING';  // WAITING -> DEALING -> BIDDING -> PLAYING -> ENDED
    this.players = [];
    this.currentTrick = [];
    this.scores = new Map();
    this.currentPlayer = null;
    this.bids = new Map();
    this.hands = new Map();
    this.lastCardPlayed = null;
  }
}

const wss = new WebSocket.Server({ port: 8080 });

// Auto-reconnect settings
const RECONNECT_TIMEOUT = 5000;
const MAX_RECONNECT_ATTEMPTS = 3;

function broadcastToGame(gameId, message, excludePlayer = null) {
  const game = games.get(gameId);
  if (!game) return;

  game.players.forEach(playerId => {
    if (playerId !== excludePlayer) {
      const ws = playerConnections.get(playerId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    }
  });
}

function handleJoin(ws, gameId, playerId) {
  let game = games.get(gameId);
  
  if (!game) {
    game = new GameState(gameId);
    games.set(gameId, game);
  }

  if (game.players.length >= 4) {
    ws.send(JSON.stringify({ event: 'ERROR', payload: 'Game is full' }));
    return;
  }

  game.players.push(playerId);
  playerConnections.set(playerId, ws);

  // Start game if we have enough players
  if (game.players.length >= 2) {
    game.phase = 'DEALING';
    broadcastToGame(gameId, { 
      event: 'GAME_START',
      payload: { players: game.players }
    });
    dealCards(game);
  }
}

function validateAndProcessBid(gameId, playerId, bid) {
  const game = games.get(gameId);
  if (!game || game.phase !== 'BIDDING') return false;

  if (!validateBid(bid)) {
    return false;
  }

  game.bids.set(playerId, bid);
  
  // Check if all players have bid
  if (game.bids.size === game.players.length) {
    game.phase = 'PLAYING';
    broadcastToGame(gameId, {
      event: 'PHASE_CHANGE',
      payload: { phase: 'PLAYING', bids: Object.fromEntries(game.bids) }
    });
  }

  return true;
}

function resolveTrick(gameId, playerId, card) {
  const game = games.get(gameId);
  if (!game || game.phase !== 'PLAYING') return;

  // Add card to current trick
  game.currentTrick.push({ playerId, card });
  game.lastCardPlayed = card;

  // Broadcast card played
  broadcastToGame(gameId, {
    event: 'CARD_PLAYED',
    payload: { playerId, card }
  });

  // If trick is complete, determine winner
  if (game.currentTrick.length === game.players.length) {
    const winner = determineTrickWinner(game.currentTrick, game.lastCardPlayed);
    
    // Update scores
    const currentScore = game.scores.get(winner.playerId) || 0;
    game.scores.set(winner.playerId, currentScore + 1);

    broadcastToGame(gameId, {
      event: 'TRICK_COMPLETE',
      payload: { 
        winner: winner.playerId,
        scores: Object.fromEntries(game.scores)
      }
    });

    game.currentTrick = [];
    checkGameEnd(game);
  }
}

/**
 * Acquire a lock for an action
 * @param {string} gameId 
 * @param {string} playerId 
 * @param {string} action 
 * @returns {boolean}
 */
function acquireActionLock(gameId, playerId, action) {
  const lockKey = `${gameId}:${playerId}:${action}`;
  const now = Date.now();

  // Clear expired locks
  actionLocks.forEach((timestamp, key) => {
    if (now - timestamp > LOCK_TIMEOUT) {
      actionLocks.delete(key);
    }
  });

  if (actionLocks.has(lockKey)) {
    return false;
  }

  actionLocks.set(lockKey, now);
  return true;
}

/**
 * Release an action lock
 * @param {string} gameId 
 * @param {string} playerId 
 * @param {string} action 
 */
function releaseActionLock(gameId, playerId, action) {
  const lockKey = `${gameId}:${playerId}:${action}`;
  actionLocks.delete(lockKey);
}

/**
 * Update player activity timestamp
 * @param {string} playerId 
 */
function updatePlayerActivity(playerId) {
  playerActivity.set(playerId, Date.now());
}

/**
 * Check if a player has timed out
 * @param {string} playerId 
 * @returns {boolean}
 */
function hasPlayerTimedOut(playerId) {
  const lastActive = playerActivity.get(playerId);
  return !lastActive || Date.now() - lastActive > PLAYER_TIMEOUT;
}

// Modify the card play handling
function handleCardPlay(ws, gameId, playerId, card) {
  if (!acquireActionLock(gameId, playerId, 'PLAY')) {
    ws.send(JSON.stringify({
      event: 'ERROR',
      payload: 'Action in progress'
    }));
    return;
  }

  try {
    const game = games.get(gameId);
    if (!game || game.phase !== 'PLAYING') {
      throw new Error('Invalid game state');
    }

    if (hasPlayerTimedOut(playerId)) {
      throw new Error('Player timed out');
    }

    // Process the card play
    resolveTrick(gameId, playerId, card);
    updatePlayerActivity(playerId);
  } catch (error) {
    ws.send(JSON.stringify({
      event: 'ERROR',
      payload: error.message
    }));
  } finally {
    releaseActionLock(gameId, playerId, 'PLAY');
  }
}

// Add state synchronization
function requestStateSync(ws, gameId, playerId) {
  const game = games.get(gameId);
  if (!game) return;

  const gameState = {
    phase: game.phase,
    players: game.players,
    currentTrick: game.currentTrick,
    scores: Object.fromEntries(game.scores),
    currentPlayer: game.currentPlayer,
    lastCardPlayed: game.lastCardPlayed
  };

  ws.send(JSON.stringify({
    event: 'STATE_SYNC',
    payload: gameState
  }));
}

wss.on('connection', (ws) => {
  let reconnectAttempts = 0;
  
  ws.on('message', (data) => {
    try {
      const { event, gameId, playerId, payload } = JSON.parse(data);
      
      updatePlayerActivity(playerId);

      switch(event) {
        case 'JOIN':
          handleJoin(ws, gameId, playerId);
          break;
          
        case 'BID':
          if (validateAndProcessBid(gameId, playerId, payload)) {
            broadcastToGame(gameId, {
              event: 'BID_MADE',
              payload: { playerId, bid: payload }
            });
          }
          break;
          
        case 'SYNC_REQUEST':
          requestStateSync(ws, gameId, playerId);
          break;

        case 'PLAY':
          handleCardPlay(ws, gameId, playerId, payload.card);
          break;
          
        case 'PING':
          ws.send(JSON.stringify({ event: 'PONG' }));
          break;
      }
    } catch (err) {
      console.error('Message processing error:', err);
      ws.send(JSON.stringify({ 
        event: 'ERROR',
        payload: 'Invalid message format'
      }));
    }
  });

  // Handle disconnections with auto-reconnect
  ws.on('close', () => {
    const reconnect = () => {
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        setTimeout(() => {
          if (ws.readyState === WebSocket.CLOSED) {
            ws = new WebSocket(ws.url);
            ws.emit('reconnect');
          }
        }, RECONNECT_TIMEOUT);
      }
    };
    reconnect();
  });
});

// Add periodic cleanup
setInterval(() => {
  const now = Date.now();
  
  // Clean up expired locks
  actionLocks.forEach((timestamp, key) => {
    if (now - timestamp > LOCK_TIMEOUT) {
      actionLocks.delete(key);
    }
  });
  
  // Clean up inactive players
  playerActivity.forEach((timestamp, playerId) => {
    if (now - timestamp > PLAYER_TIMEOUT) {
      handlePlayerTimeout(playerId);
    }
  });
}, 10000);

// Replace with:
const PORT = process.env.PORT || 8080;
console.log(`WebSocket server running on port ${PORT}`);
