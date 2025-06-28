const Joi = require('joi');
const crypto = require('crypto');

class RateLimiter {
  constructor(options) {
    this.windowMs = options.windowMs || 60 * 1000; // 1 minute default
    this.max = options.max || 100; // 100 requests default
    this.requests = new Map(); // IP -> [timestamps]
    this.blacklist = new Set();
  }

  isBlocked(ip) {
    // Check blacklist
    if (this.blacklist.has(ip)) return true;

    // Clean old requests
    const now = Date.now();
    const requests = this.requests.get(ip) || [];
    const recent = requests.filter(time => now - time < this.windowMs);
    this.requests.set(ip, recent);

    // Check rate limit
    if (recent.length >= this.max) {
      this.blacklist.add(ip);
      setTimeout(() => this.blacklist.delete(ip), this.windowMs * 2);
      return true;
    }

    // Add new request
    recent.push(now);
    return false;
  }
}

// WebSocket message schemas
const messageSchemas = {
  JOIN: Joi.object({
    event: Joi.string().valid('JOIN').required(),
    gameId: Joi.string().required(),
    playerId: Joi.string().required()
  }),

  BID: Joi.object({
    event: Joi.string().valid('BID').required(),
    gameId: Joi.string().required(),
    playerId: Joi.string().required(),
    payload: Joi.object({
      type: Joi.string().valid('normal', 'nil', 'blind').required(),
      n: Joi.number().min(0).required(),
      tricksWon: Joi.number().min(0).required()
    })
  }),

  PLAY: Joi.object({
    event: Joi.string().valid('PLAY').required(),
    gameId: Joi.string().required(),
    playerId: Joi.string().required(),
    payload: Joi.object({
      card: Joi.object({
        suit: Joi.string().valid('♠', '♥', '♦', '♣').required(),
        rank: Joi.string().valid('2','3','4','5','6','7','8','9','10','J','Q','K','A').required(),
        isLast: Joi.boolean()
      })
    })
  })
};

function validateWebSocketMessage(data) {
  try {
    const message = JSON.parse(data);
    const schema = messageSchemas[message.event];
    if (!schema) {
      throw new Error(`Unknown event type: ${message.event}`);
    }
    return schema.validate(message);
  } catch (err) {
    throw new Error('Invalid message format');
  }
}

const ALLOWED_ORIGINS = new Set([
  'http://localhost:3000',
  'https://call-bray-game.com'
]);

function isValidOrigin(origin) {
  return ALLOWED_ORIGINS.has(origin);
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

class SecurityAuditLog {
  constructor() {
    this.logs = new Map(); // IP -> [events]
  }

  log(ip, event, details) {
    const events = this.logs.get(ip) || [];
    events.push({
      timestamp: new Date(),
      event,
      details
    });
    this.logs.set(ip, events);

    // Alert on suspicious activity
    if (this.isSuspicious(ip)) {
      console.warn(`Suspicious activity detected from IP: ${ip}`);
    }
  }

  isSuspicious(ip) {
    const events = this.logs.get(ip) || [];
    const recentEvents = events.filter(e => 
      Date.now() - e.timestamp < 5 * 60 * 1000 // Last 5 minutes
    );
    
    return recentEvents.length > 500 || // Too many events
           this.hasRepeatedFailures(recentEvents);
  }

  hasRepeatedFailures(events) {
    const failures = events.filter(e => e.event === 'validation_failure');
    return failures.length >= 10;
  }
}

module.exports = {
  RateLimiter,
  validateWebSocketMessage,
  isValidOrigin,
  generateSessionToken,
  SecurityAuditLog
}; 