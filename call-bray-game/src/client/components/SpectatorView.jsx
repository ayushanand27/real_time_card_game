import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { calculateScore } from '../bid-ui.js';
import './SpectatorView.css';

/**
 * SpectatorView Component
 * Shows all players' cards face up with real-time game state
 */
const SpectatorView = ({ gameId, onGameStateUpdate }) => {
  const queryClient = useQueryClient();
  const [highlightedCards, setHighlightedCards] = useState(new Set());
  const [lastPlayedCard, setLastPlayedCard] = useState(null);

  // React Query for game state
  const { data: gameState, isLoading, error } = useQuery({
    queryKey: ['gameState', gameId],
    queryFn: () => fetchGameState(gameId),
    refetchInterval: 1000, // Real-time updates
    staleTime: 500,
  });

  // Mutation for game state updates
  const updateGameState = useMutation({
    mutationFn: (newState) => updateGameStateOnServer(gameId, newState),
    onSuccess: () => {
      queryClient.invalidateQueries(['gameState', gameId]);
    },
  });

  // Calculate last-card powers
  const lastCardPowers = useMemo(() => {
    if (!gameState?.players) return new Map();
    
    const powers = new Map();
    gameState.players.forEach(player => {
      const lastCard = player.hand[player.hand.length - 1];
      if (lastCard && isLastCardPower(lastCard, gameState.currentSuit)) {
        powers.set(player.id, lastCard);
      }
    });
    return powers;
  }, [gameState]);

  // Highlight last-card powers
  useEffect(() => {
    const newHighlighted = new Set();
    lastCardPowers.forEach((card, playerId) => {
      newHighlighted.add(`${playerId}-${card.suit}-${card.rank}`);
    });
    setHighlightedCards(newHighlighted);
  }, [lastCardPowers]);

  // Handle card play animation
  const handleCardPlay = (playerId, card) => {
    setLastPlayedCard({ playerId, card, timestamp: Date.now() });
    
    // Remove highlight after animation
    setTimeout(() => {
      setLastPlayedCard(null);
    }, 2000);
  };

  if (isLoading) {
    return (
      <div className="spectator-loading">
        <div className="loading-spinner"></div>
        <p>Loading game state...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="spectator-error">
        <h3>Error loading game</h3>
        <p>{error.message}</p>
      </div>
    );
  }

  return (
    <div className="spectator-view">
      {/* Game Header */}
      <div className="spectator-header">
        <h2>Spectator Mode - Game #{gameId}</h2>
        <div className="game-status">
          <span className={`status-indicator ${gameState?.phase}`}>
            {gameState?.phase?.toUpperCase()}
          </span>
          <span className="player-count">
            {gameState?.players?.length || 0} Players
          </span>
        </div>
      </div>

      {/* Game Statistics */}
      <div className="game-stats">
        <div className="stat-card">
          <h4>Current Round</h4>
          <span className="stat-value">{gameState?.currentRound || 1}</span>
        </div>
        <div className="stat-card">
          <h4>Deck Remaining</h4>
          <span className="stat-value">{gameState?.deckRemaining || 52}</span>
        </div>
        <div className="stat-card">
          <h4>Last Card Powers</h4>
          <span className="stat-value">{lastCardPowers.size}</span>
        </div>
      </div>

      {/* Players Grid */}
      <div className="players-grid">
        {gameState?.players?.map((player, index) => (
          <PlayerSpectatorCard
            key={player.id}
            player={player}
            isCurrentPlayer={player.id === gameState.currentPlayer}
            lastCardPower={lastCardPowers.get(player.id)}
            highlightedCards={highlightedCards}
            onCardPlay={handleCardPlay}
            position={index}
          />
        ))}
      </div>

      {/* Last Played Card Animation */}
      {lastPlayedCard && (
        <div className="last-played-animation">
          <div className="played-card">
            <div className="card-inner">
              <div className={`card-rank ${isRedSuit(lastPlayedCard.card.suit) ? 'red' : 'black'}`}>
                {lastPlayedCard.card.rank}
              </div>
              <div className={`card-suit ${isRedSuit(lastPlayedCard.card.suit) ? 'red' : 'black'}`}>
                {lastPlayedCard.card.suit}
              </div>
            </div>
            <div className="player-name">
              {gameState?.players?.find(p => p.id === lastPlayedCard.playerId)?.name}
            </div>
          </div>
        </div>
      )}

      {/* Game Controls */}
      <div className="spectator-controls">
        <button 
          className="control-btn"
          onClick={() => updateGameState.mutate({ action: 'pause' })}
        >
          ⏸️ Pause
        </button>
        <button 
          className="control-btn"
          onClick={() => updateGameState.mutate({ action: 'resume' })}
        >
          ▶️ Resume
        </button>
        <button 
          className="control-btn"
          onClick={() => window.print()}
        >
          🖨️ Print View
        </button>
      </div>
    </div>
  );
};

/**
 * Individual Player Card Component
 */
const PlayerSpectatorCard = ({ 
  player, 
  isCurrentPlayer, 
  lastCardPower, 
  highlightedCards, 
  onCardPlay, 
  position 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const renderCard = (card, index) => {
    const cardKey = `${player.id}-${card.suit}-${card.rank}`;
    const isHighlighted = highlightedCards.has(cardKey);
    const isLastCard = index === player.hand.length - 1;
    const isLastCardPowerActive = lastCardPower && isLastCard;

    return (
      <div
        key={cardKey}
        className={`spectator-card ${isHighlighted ? 'highlighted' : ''} ${isLastCardPowerActive ? 'power-active' : ''}`}
        onClick={() => onCardPlay(player.id, card)}
        style={{
          transform: isHighlighted ? 'scale(1.1) rotate(5deg)' : 'scale(1)',
          zIndex: isHighlighted ? 10 : 1,
          animation: isLastCardPowerActive ? 'pulse 2s infinite' : 'none'
        }}
      >
        <div className="card-inner">
          <div className={`card-rank ${isRedSuit(card.suit) ? 'red' : 'black'}`}>
            {card.rank}
          </div>
          <div className={`card-suit ${isRedSuit(card.suit) ? 'red' : 'black'}`}>
            {card.suit}
          </div>
        </div>
        {isLastCardPowerActive && (
          <div className="power-indicator">⚡</div>
        )}
      </div>
    );
  };

  return (
    <div className={`player-spectator-card ${isCurrentPlayer ? 'current-player' : ''}`}>
      {/* Player Header */}
      <div className="player-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="player-info">
          <h3 className="player-name">{player.name}</h3>
          <span className="player-position">Position {position + 1}</span>
        </div>
        <div className="player-stats">
          <span className="score">{player.score || 0}</span>
          <span className="cards-count">{player.hand?.length || 0} cards</span>
        </div>
        <div className="expand-icon">
          {isExpanded ? '▼' : '▶'}
        </div>
      </div>

      {/* Current Bid */}
      {player.currentBid && (
        <div className="current-bid">
          <span className="bid-type">{player.currentBid.type}</span>
          <span className="bid-amount">{player.currentBid.n}</span>
        </div>
      )}

      {/* Cards Display */}
      <div className={`cards-display ${isExpanded ? 'expanded' : ''}`}>
        <div className="cards-container">
          {player.hand?.map(renderCard)}
        </div>
      </div>

      {/* Last Card Power Info */}
      {lastCardPower && (
        <div className="last-card-info">
          <div className="power-description">
            <strong>Last Card Power:</strong> {getLastCardPowerDescription(lastCardPower)}
          </div>
        </div>
      )}
    </div>
  );
};

// Utility functions
const fetchGameState = async (gameId) => {
  const response = await fetch(`/api/game/${gameId}/state`);
  if (!response.ok) {
    throw new Error('Failed to fetch game state');
  }
  return response.json();
};

const updateGameStateOnServer = async (gameId, newState) => {
  const response = await fetch(`/api/game/${gameId}/state`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newState),
  });
  if (!response.ok) {
    throw new Error('Failed to update game state');
  }
  return response.json();
};

const isRedSuit = (suit) => suit === '♥' || suit === '♦';

const isLastCardPower = (card, currentSuit) => {
  // Implement last card power logic based on game rules
  return card.suit === currentSuit || card.rank === 'A';
};

const getLastCardPowerDescription = (card) => {
  if (card.rank === 'A') return 'Ace - Highest card in suit';
  return `${card.suit} - Trump suit advantage`;
};

export default SpectatorView; 