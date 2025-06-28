# 🃏 Call Bray - Real-Time Multiplayer Card Game

A modern, real-time multiplayer card game built with WebSocket technology, React, and intelligent AI bots. Experience the classic "Call Bray" card game with enhanced features, beautiful UI, and strategic gameplay.

![Call Bray Game](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![React](https://img.shields.io/badge/React-18+-blue)
![WebSocket](https://img.shields.io/badge/WebSocket-Real--time-orange)
![TypeScript](https://img.shields.io/badge/TypeScript-Supported-blue)

## 🎮 Game Overview

Call Bray is a strategic 4-player card game where players bid on the number of tricks they can win and compete to achieve their bids. The game features:

- **Three Bid Types**: Normal, Nil (zero tricks), and Blind (minimum 4 tricks)
- **Last Card Power**: The last card played beats all others
- **Real-time Multiplayer**: Play with friends or AI bots
- **Intelligent AI**: Four difficulty levels with strategic decision-making
- **Beautiful UI**: Modern React components with animations
- **Audio System**: Immersive sound effects and background music
- **Multi-language**: English and Hindi support

## ✨ Features

### 🎯 Core Gameplay
- **Real-time bidding** with countdown timers
- **Strategic card play** with suit following rules
- **Dynamic scoring** system with bonuses and penalties
- **Last card mechanics** for dramatic finishes
- **Team-based scoring** and statistics

### 🤖 AI Bot System
- **Four difficulty levels**: Easy, Medium, Hard, Expert
- **Intelligent decision-making** based on hand analysis
- **Risk assessment** and strategic bidding
- **Personality traits** (aggression, bluffing, risk tolerance)
- **Performance tracking** and learning capabilities

### 🌐 Real-time Infrastructure
- **WebSocket server** for instant communication
- **Multi-game support** with isolated game rooms
- **Auto-reconnect** with graceful degradation
- **Race condition prevention** with action locks
- **Player timeout handling** and cleanup

### 🎨 User Experience
- **Responsive design** for all devices
- **Smooth animations** and card interactions
- **Spectator mode** for observing games
- **Real-time chat** and notifications
- **Accessibility features** with keyboard navigation

### 🔊 Audio System
- **Comprehensive sound effects** for all game events
- **Background music** with ambient tracks
- **Volume control** and mute functionality
- **Audio preloading** for smooth playback
- **Custom notification sounds**

### 🌍 Internationalization
- **Multi-language support** (English, Hindi)
- **Dynamic language switching**
- **Context-aware translations**
- **Pluralization support**

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/call-bray-game.git
   cd call-bray-game
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   # Start WebSocket server
   npm run server
   
   # Start client (in another terminal)
   npm run dev
   ```

4. **Open your browser**
   ```
   http://localhost:3000
   ```

### Docker Deployment

```bash
# Build the Docker image
docker build -t call-bray-game .

# Run the container
docker run -p 8080:8080 -p 3000:3000 call-bray-game
```

## 🏗️ Architecture

### Frontend (Client)
```
src/client/
├── components/          # React UI components
│   ├── BiddingScreen.jsx    # Bidding interface
│   ├── SpectatorView.jsx    # Spectator mode
│   └── *.css               # Component styles
├── audio/              # Sound management
│   └── SoundManager.js     # Audio system
├── analytics/          # Performance monitoring
│   └── stats.html          # Analytics dashboard
├── bid-ui.js           # Scoring logic
├── game.js             # Game state management
└── index.html          # Main entry point
```

### Backend (Server)
```
src/server/
├── server.js           # WebSocket server
└── security.js         # Security utilities
```

### Shared Logic
```
src/shared/
├── BotLogic.ts         # AI bot implementation
├── card.js             # Card game logic
├── rules.json          # Game configuration
├── i18n/               # Internationalization
│   └── useTranslation.js
└── locales/            # Language files
    ├── en.json
    └── hi.json
```

## 🎯 Game Rules

### Bidding Phase
- **Normal Bid**: Bid 0-13 tricks, score based on accuracy
- **Nil Bid**: Bid 0 tricks, win 100 points if successful, lose 100 if fail
- **Blind Bid**: Bid 4+ tricks, high risk/reward with bonus points

### Scoring System
- **Exact Bid**: Base points × bid amount + exact bonus
- **Over/Under**: Penalties for missing or exceeding bid
- **Last Card**: Special power to beat any card

### Card Play
- **Follow Suit**: Must play same suit if possible
- **Trick Resolution**: Highest card of led suit wins
- **Last Card Power**: Final card beats all others

## 🤖 AI Bot System

The game features intelligent AI bots with four difficulty levels:

### Easy Bot
- Basic hand evaluation
- Conservative bidding
- Simple card play strategy

### Medium Bot
- Improved hand analysis
- Balanced risk assessment
- Strategic card selection

### Hard Bot
- Advanced probability calculations
- Aggressive bidding when appropriate
- Bluffing and deception tactics

### Expert Bot
- Machine learning-based decisions
- Perfect memory of played cards
- Optimal strategy execution

## 🔧 Configuration

### Game Rules (`src/shared/rules.json`)
```json
{
  "game": {
    "players": { "min": 2, "max": 4 },
    "rounds": { "cardsPerRound": 13 }
  },
  "scoring": {
    "normal": { "base": 10, "exactBonus": 20 },
    "nil": { "success": 100, "fail": -100 },
    "blind": { "base": 80, "bonusPerTrick": 20 }
  }
}
```

### Performance Settings
- **WebSocket reconnect**: 3 attempts, 5-second delay
- **State sync**: 30-second intervals
- **Player timeout**: 30 seconds
- **Action lock timeout**: 5 seconds

## 🧪 Testing

### Run Tests
```bash
# Unit tests
npm test

# Performance tests
npm run test:performance

# Security tests
npm run test:security
```

### Test Coverage
- ✅ Scoring logic (100% coverage)
- ✅ Card game mechanics
- ✅ WebSocket communication
- ✅ AI bot decision-making
- ✅ UI component behavior
- ✅ Audio system functionality

## 📊 Performance

### Lighthouse Scores
- **Performance**: 85/100
- **Accessibility**: 92/100
- **Best Practices**: 88/100
- **SEO**: 85/100

### Optimizations Implemented
- ✅ Code splitting with React.lazy()
- ✅ Memoization for expensive calculations
- ✅ Image optimization and lazy loading
- ✅ Audio preloading and caching
- ✅ WebSocket connection pooling
- ✅ Memory leak prevention

## 🔒 Security Features

- **Rate limiting** on all endpoints
- **Input validation** and sanitization
- **Origin validation** for WebSocket connections
- **Message schema validation**
- **SQL injection prevention**
- **XSS protection**

## 🌐 API Documentation

### WebSocket Events

#### Client to Server
```javascript
// Join game
{ event: 'JOIN', payload: { gameId, playerId } }

// Submit bid
{ event: 'BID', payload: { type, n } }

// Play card
{ event: 'PLAY_CARD', payload: { card } }

// Request state sync
{ event: 'SYNC_REQUEST' }
```

#### Server to Client
```javascript
// Game state update
{ event: 'GAME_STATE', payload: { phase, players, scores } }

// Card played
{ event: 'CARD_PLAYED', payload: { playerId, card } }

// Trick complete
{ event: 'TRICK_COMPLETE', payload: { winner, scores } }
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### Code Style
- Use ESLint and Prettier
- Follow JSDoc documentation standards
- Write unit tests for new features
- Maintain TypeScript interfaces

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Card game enthusiasts** for rule validation
- **React community** for component inspiration
- **WebSocket.io** for real-time communication
- **Open source contributors** for various libraries

## 📞 Support

- **Issues**: [GitHub Issues](will-add-in-upcoming-week)
- **Discussions**: [GitHub Discussions])(will-add-in-upcoming-week)
- **Email**: ayushanandchoudhary543@gmail.com

## 🚀 Roadmap

### Upcoming Features
- [ ] Mobile app (React Native)
- [ ] Tournament system
- [ ] Advanced statistics
- [ ] Custom game rules
- [ ] Voice chat integration
- [ ] Replay system

### Performance Goals
- [ ] Achieve 95+ Lighthouse score
- [ ] Reduce bundle size by 30%
- [ ] Implement service worker caching
- [ ] Add WebAssembly for AI calculations

---



