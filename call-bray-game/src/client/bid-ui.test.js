import { 
  calculateScore, 
  validateBid, 
  calculateTeamScore, 
  calculateScoreMemoized,
  clearScoreCache 
} from './bid-ui.js';
import { game } from './game';
import WebSocket from 'ws';

describe('Bid Scoring System', () => {
  test('normal bid scoring', () => {
    expect(calculateScore('normal', 3, 3)).toBe(30); // Exact match
    expect(calculateScore('normal', 3, 4)).toBe(35); // One over
    expect(calculateScore('normal', 3, 2)).toBe(-10); // One under
    expect(calculateScore('normal', 3, 0)).toBe(-30); // Three under
  });

  test('nil bid scoring', () => {
    expect(calculateScore('nil', 0, 0)).toBe(100); // Success
    expect(calculateScore('nil', 0, 1)).toBe(-100); // Failure
  });

  test('blind bid scoring', () => {
    expect(calculateScore('blind', 4, 4)).toBe(80); // Minimum success
    expect(calculateScore('blind', 4, 5)).toBe(100); // Extra trick
    expect(calculateScore('blind', 4, 3)).toBe(0); // Failure
  });

  test('invalid bid types', () => {
    expect(() => calculateScore('invalid', 3, 3)).toThrow();
    expect(() => calculateScore('normal', -1, 3)).toThrow();
    expect(() => calculateScore('normal', 3, -1)).toThrow();
  });
});

describe('Bid Validation', () => {
  test('validates normal bids', () => {
    expect(validateBid({ type: 'normal', n: 3, tricksWon: 0 })).toBe(true);
    expect(validateBid({ type: 'normal', n: 0, tricksWon: 0 })).toBe(true);
    expect(validateBid({ type: 'normal', n: -1, tricksWon: 0 })).toBe(false);
  });

  test('validates nil bids', () => {
    expect(validateBid({ type: 'nil', n: 0, tricksWon: 0 })).toBe(true);
    expect(validateBid({ type: 'nil', n: 1, tricksWon: 0 })).toBe(false);
  });

  test('validates blind bids', () => {
    expect(validateBid({ type: 'blind', n: 4, tricksWon: 0 })).toBe(true);
    expect(validateBid({ type: 'blind', n: 3, tricksWon: 0 })).toBe(false);
  });
});

describe('Team Score Calculation', () => {
  test('calculates team score correctly', () => {
    const bids = [
      { type: 'normal', n: 3, tricksWon: 3 },
      { type: 'nil', n: 0, tricksWon: 0 }
    ];
    expect(calculateTeamScore(bids)).toBe(130); // 30 + 100
  });

  test('handles invalid bids', () => {
    const bids = [
      { type: 'normal', n: 3, tricksWon: 3 },
      { type: 'invalid', n: 0, tricksWon: 0 }
    ];
    expect(() => calculateTeamScore(bids)).toThrow();
  });
});

describe('WebSocket Game Integration', () => {
  let server;
  let client;
  const PORT = 8081;
  const GAME_ID = 'test-game';
  const PLAYER_ID = 'test-player';

  beforeEach((done) => {
    server = new WebSocket.Server({ port: PORT });
    server.on('listening', () => {
      client = new WebSocket(`ws://localhost:${PORT}`);
      client.on('open', done);
    });
  });

  afterEach((done) => {
    client.close();
    server.close(done);
  });

  test('connects and joins game', (done) => {
    server.on('connection', (ws) => {
      ws.on('message', (data) => {
        const message = JSON.parse(data);
        expect(message.event).toBe('JOIN');
        expect(message.gameId).toBe(GAME_ID);
        expect(message.playerId).toBe(PLAYER_ID);
        done();
      });
    });

    game.connect(GAME_ID, PLAYER_ID);
  });

  test('handles reconnection after timeout', (done) => {
    let connectionCount = 0;
    
    server.on('connection', () => {
      connectionCount++;
      if (connectionCount === 2) {
        done();
      }
    });

    game.connect(GAME_ID, PLAYER_ID);
    client.close(); // Force disconnect
  }, 10000);

  test('validates and processes bids', (done) => {
    server.on('connection', (ws) => {
      ws.on('message', (data) => {
        const message = JSON.parse(data);
        if (message.event === 'BID') {
          expect(validateBid(message.payload)).toBe(true);
          done();
        }
      });
    });

    game.connect(GAME_ID, PLAYER_ID);
    game.submitBid({ type: 'normal', n: 3, tricksWon: 0 });
  });

  test('last card power rule', (done) => {
    const lastCard = { suit: '♠', rank: '2', isLast: true };
    const ace = { suit: '♥', rank: 'A' };
    
    server.on('connection', (ws) => {
      ws.send(JSON.stringify({
        event: 'CARD_PLAYED',
        payload: { card: lastCard }
      }));
    });

    game.on('CARD_PLAYED', (payload) => {
      expect(payload.card.isLast).toBe(true);
      expect(game.isValidPlay(ace)).toBe(false);
      done();
    });

    game.connect(GAME_ID, PLAYER_ID);
  });
}); 