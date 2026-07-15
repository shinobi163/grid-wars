import React from 'react';
import styles from './CardsHand.module.css';
import { useGameStore } from '../store/gameStore';

export const CardsHand: React.FC = () => {
  const {
    playerHand,
    deck,
    discardPile,
    selectedCardId,
    selectCard,
    currentPlayer,
    winner
  } = useGameStore();

  const isPlayerTurn = currentPlayer === 'player';
  const isDisabled = !isPlayerTurn || !!winner;

  const handleCardClick = (cardId: string) => {
    if (isDisabled) return;
    if (selectedCardId === cardId) {
      selectCard(null); // Deselect
    } else {
      selectCard(cardId); // Select
    }
  };

  return (
    <div className={styles.handContainer}>
      <div className={styles.handHeader}>
        <span className={styles.title}>Your Hand</span>
        <span className={styles.deckStatus}>
          Deck: {deck.length} left | Discard: {discardPile.length}
        </span>
      </div>

      {playerHand.length === 0 ? (
        <div className={styles.emptyHand}>Hand is empty. End turn to draw a card.</div>
      ) : (
        <div className={styles.cardsRow}>
          {playerHand.map(card => {
            const isSelected = selectedCardId === card.id;
            return (
              <div
                key={card.id}
                className={`
                  ${styles.card}
                  ${isSelected ? styles.selected : ''}
                  ${isDisabled ? styles.disabled : ''}
                `}
                onClick={() => handleCardClick(card.id)}
              >
                <div className={styles.cardName}>{card.name}</div>
                <div className={styles.cardDesc}>{card.description}</div>
                <div className={styles.cardFooter}>
                  {card.category === 'equipment' ? 'Equipment' : 'Instant'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default CardsHand;
