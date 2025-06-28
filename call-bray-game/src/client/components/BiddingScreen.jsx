import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { calculateScore, validateBid } from '../bid-ui.js';
import { useTranslation } from '../shared/i18n/useTranslation';
import { game } from '../game';
import './BiddingScreen.css';

/**
 * BiddingScreen Component
 * Handles the bidding phase of the Call Bray card game
 */
const BiddingScreen = ({ 
  playerHand = [], 
  onBidSubmit, 
  timeLimit = 30, 
  isBlindMode = false,
  currentPlayer = 'Player 1',
  gameState = 'bidding'
}) => {
  const { t } = useTranslation();
  // State management
  const [selectedType, setSelectedType] = useState('normal');
  const [bidAmount, setBidAmount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Timer effect
  useEffect(() => {
    if (gameState !== 'bidding' || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Auto-submit current bid when timer expires
          handleSubmit();
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, selectedType, bidAmount]);

  // Auto-submit handler
  const handleSubmit = useCallback(() => {
    if (!isSubmitting) {
      setIsSubmitting(true);
      const bid = {
        type: selectedType,
        n: bidAmount,
        tricksWon: 0 // Will be updated during play
      };

      if (!validateBid(bid)) {
        setError(t('errors.invalidBid'));
        return;
      }

      game.submitBid(bid);
    }
  }, [selectedType, bidAmount, isSubmitting, t]);

  // Score calculation
  const predictedScore = useMemo(() => {
    try {
      return calculateScore(selectedType, bidAmount, 0);
    } catch (err) {
      return 0;
    }
  }, [selectedType, bidAmount]);

  // Event handlers
  const handleTypeSelect = (type) => {
    setSelectedType(type);
    if (type === 'nil') {
      setBidAmount(0);
    }
    setError('');
  };

  const handleAmountChange = (amount) => {
    if (selectedType === 'nil') return;
    
    const num = parseInt(amount, 10);
    if (isNaN(num) || num < 0) return;
    
    if (selectedType === 'blind' && num < 4) {
      setError(t('errors.blindMinimum'));
      return;
    }
    
    setError('');
    setBidAmount(num);
  };

  // Card rendering
  const renderCard = (card, index) => (
    <div
      key={`${card.suit}-${card.rank}-${index}`}
      className={`card ${hoveredCard === index ? 'card-hovered' : ''}`}
      onMouseEnter={() => setHoveredCard(index)}
      onMouseLeave={() => setHoveredCard(null)}
      style={{
        transform: hoveredCard === index ? 'translateY(-10px) scale(1.1)' : 'translateY(0) scale(1)',
        zIndex: hoveredCard === index ? 10 : 1
      }}
    >
      <div className="card-inner">
        <div className={`card-rank ${card.suit === '♥' || card.suit === '♦' ? 'red' : 'black'}`}>
          {card.rank}
        </div>
        <div className={`card-suit ${card.suit === '♥' || card.suit === '♦' ? 'red' : 'black'}`}>
          {card.suit}
        </div>
      </div>
    </div>
  );

  return (
    <div className="bidding-container">
      <div className="bid-header">
        <h2>{t('bidding.title')}</h2>
        <div className="timer">
          {timeLeft}s
        </div>
      </div>

      <div className="bid-type-selector">
        {['normal', 'nil', 'blind'].map(type => (
          <button
            key={type}
            className={`bid-type-button ${selectedType === type ? 'selected' : ''}`}
            onClick={() => handleTypeSelect(type)}
          >
            {t(`bidTypes.${type}`)}
          </button>
        ))}
      </div>

      {selectedType !== 'nil' && (
        <div className="bid-amount">
          <label>{t('bidding.amount')}</label>
          <input
            type="number"
            min={selectedType === 'blind' ? 4 : 0}
            value={bidAmount}
            onChange={(e) => handleAmountChange(e.target.value)}
          />
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="last-card-warning">
        {game.state.lastCardPlayed?.isLast && (
          <div className="warning">
            {t('bidding.lastCardWarning')}
          </div>
        )}
      </div>

      <button 
        className="submit-bid-button"
        onClick={handleSubmit}
        disabled={!!error}
      >
        {t('bidding.submit')}
      </button>
    </div>
  );
};

export default BiddingScreen; 