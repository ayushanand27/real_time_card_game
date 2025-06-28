import { Card } from './card';

describe('Card Class', () => {
  describe('Constructor and Validation', () => {
    test('creates valid card', () => {
      const card = new Card('♠', 'A');
      expect(card.suit).toBe('♠');
      expect(card.rank).toBe('A');
      expect(card.isLastCard).toBe(false);
    });

    test('throws on invalid suit', () => {
      expect(() => new Card('X', 'A')).toThrow('Invalid suit');
    });

    test('throws on invalid rank', () => {
      expect(() => new Card('♠', '1')).toThrow('Invalid rank');
    });
  });

  describe('Deck Creation', () => {
    test('creates full deck', () => {
      const deck = Card.createDeck();
      expect(deck.length).toBe(52);
      expect(deck[deck.length - 1].isLastCard).toBe(true);
    });

    test('deck contains all combinations', () => {
      const deck = Card.createDeck();
      Card.SUITS.forEach(suit => {
        Card.RANKS.forEach(rank => {
          expect(deck.some(card => card.suit === suit && card.rank === rank)).toBe(true);
        });
      });
    });

    test('shuffle produces different order', () => {
      const deck1 = Card.createDeck();
      const deck2 = Card.createDeck();
      expect(deck1.map(c => c.toString())).not.toEqual(deck2.map(c => c.toString()));
    });
  });

  describe('Card Dealing', () => {
    test('deals correct number of cards', () => {
      const deck = Card.createDeck();
      const hands = Card.dealCards(deck, 4, 13);
      expect(hands.length).toBe(4);
      hands.forEach(hand => expect(hand.length).toBe(13));
    });

    test('throws if not enough cards', () => {
      const deck = Card.createDeck();
      expect(() => Card.dealCards(deck, 5, 13)).toThrow('Not enough cards');
    });

    test('deals unique cards', () => {
      const deck = Card.createDeck();
      const hands = Card.dealCards(deck, 4, 13);
      const allCards = hands.flat().map(c => c.toString());
      const uniqueCards = new Set(allCards);
      expect(uniqueCards.size).toBe(allCards.length);
    });
  });

  describe('Card Comparison Rules', () => {
    test('last card beats everything', () => {
      const lastCard = new Card('♠', '2', true);
      const aceHearts = new Card('♥', 'A');
      expect(lastCard.beats(aceHearts, '♥')).toBe(true);
      expect(aceHearts.beats(lastCard, '♥')).toBe(false);
    });

    test('must follow suit if possible', () => {
      const sevenHearts = new Card('♥', '7');
      const hand = [
        new Card('♥', '2'),
        new Card('♠', 'A'),
        new Card('♦', 'K')
      ];
      expect(sevenHearts.canPlay(hand, '♥')).toBe(true);
      expect(hand[1].canPlay(hand, '♥')).toBe(false);
    });

    test('higher rank of same suit wins', () => {
      const kingSpades = new Card('♠', 'K');
      const queenSpades = new Card('♠', 'Q');
      expect(kingSpades.beats(queenSpades, '♠')).toBe(true);
      expect(queenSpades.beats(kingSpades, '♠')).toBe(false);
    });

    test('led suit beats off-suit', () => {
      const twoHearts = new Card('♥', '2');
      const aceSpades = new Card('♠', 'A');
      expect(twoHearts.beats(aceSpades, '♥')).toBe(true);
      expect(aceSpades.beats(twoHearts, '♥')).toBe(false);
    });

    test('trump suit rules', () => {
      const twoHearts = new Card('♥', '2');
      const aceSpades = new Card('♠', 'A');
      expect(twoHearts.beats(aceSpades, '♠', '♥')).toBe(true); // Hearts is trump
    });
  });

  describe('String Conversion', () => {
    test('converts to string correctly', () => {
      const card = new Card('♠', 'A', true);
      expect(card.toString()).toBe('♠A*');
    });

    test('creates from string correctly', () => {
      const card = Card.fromString('♠A*');
      expect(card.suit).toBe('♠');
      expect(card.rank).toBe('A');
      expect(card.isLastCard).toBe(true);
    });

    test('roundtrip conversion', () => {
      const original = new Card('♥', 'K', true);
      const roundtrip = Card.fromString(original.toString());
      expect(roundtrip.suit).toBe(original.suit);
      expect(roundtrip.rank).toBe(original.rank);
      expect(roundtrip.isLastCard).toBe(original.isLastCard);
    });
  });
}); 