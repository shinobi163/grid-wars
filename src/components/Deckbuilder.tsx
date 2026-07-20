import React, { useMemo } from 'react';
import styles from './Deckbuilder.module.css';
import { useGameStore } from '../store/gameStore';
import {
  CARD_DEFAULTS,
  CARD_CAPS,
  DECK_TARGET_SIZE,
  CARD_TEMPLATES,
  CardType
} from '../config/cardTemplates';
import { GoldIcon } from './UnitIcons';

export const Deckbuilder: React.FC = () => {
  const { customDeckComposition, setDeckComposition, startGame } = useGameStore();

  const totalCards = useMemo(() => {
    return Object.values(customDeckComposition).reduce((sum, count) => sum + count, 0);
  }, [customDeckComposition]);

  const isValid = totalCards === DECK_TARGET_SIZE;

  const handleIncrement = (type: string) => {
    const current = customDeckComposition[type] || 0;
    const cap = CARD_CAPS[type] || 0;
    if (current < cap) {
      setDeckComposition({
        ...customDeckComposition,
        [type]: current + 1
      });
    }
  };

  const handleDecrement = (type: string) => {
    const current = customDeckComposition[type] || 0;
    if (current > 0) {
      setDeckComposition({
        ...customDeckComposition,
        [type]: current - 1
      });
    }
  };

  const handleReset = () => {
    setDeckComposition(CARD_DEFAULTS);
  };

  const statusText = useMemo(() => {
    if (totalCards === DECK_TARGET_SIZE) {
      return { text: 'Ready to battle!', class: styles.statusValid };
    }
    if (totalCards < DECK_TARGET_SIZE) {
      return {
        text: `Under budget! Add ${DECK_TARGET_SIZE - totalCards} more card(s)`,
        class: styles.statusUnder
      };
    }
    return {
      text: `Over budget! Remove ${totalCards - DECK_TARGET_SIZE} card(s)`,
      class: styles.statusOver
    };
  }, [totalCards]);

  const cardsList = Object.keys(CARD_DEFAULTS);

  return (
    <div className={styles.deckbuilderScreen}>
      <div className={styles.container}>
        <h1 className={styles.title}>Assemble Your Deck</h1>
        <p className={styles.subtitle}>
          Choose your cards for the upcoming battle. A standard deck requires exactly{' '}
          <strong>{DECK_TARGET_SIZE}</strong> cards.
        </p>

        {/* HUD Deck Budget Indicator */}
        <div className={styles.budgetHeader}>
          <div className={styles.budgetProgress}>
            <div className={styles.budgetLabel}>Deck Size</div>
            <div className={styles.budgetValue}>
              <span className={styles.currentVal}>{totalCards}</span>
              <span className={styles.targetVal}>/ {DECK_TARGET_SIZE}</span>
            </div>
          </div>
          <div className={`${styles.statusMessage} ${statusText.class}`}>
            {statusText.text}
          </div>
        </div>

        {/* Card Selections Grid */}
        <div className={styles.cardsGrid}>
          {cardsList.map(type => {
            const template = CARD_TEMPLATES[type as CardType];
            if (!template) return null;

            const count = customDeckComposition[type] || 0;
            const cap = CARD_CAPS[type] || 0;

            return (
              <div key={type} className={styles.cardItem}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardName}>{template.name}</div>
                  <div className={styles.cardCost}>
                    <GoldIcon size={12} /> {template.goldCost}g
                  </div>
                </div>
                <div className={styles.cardDesc}>{template.description}</div>
                <div className={styles.controlsRow}>
                  <div className={styles.limits}>
                    <span>Limit: {cap}</span>
                  </div>
                  <div className={styles.steppers}>
                    <button
                      className={styles.stepperBtn}
                      onClick={() => handleDecrement(type)}
                      disabled={count === 0}
                    >
                      −
                    </button>
                    <span className={styles.counter}>{count}</span>
                    <button
                      className={styles.stepperBtn}
                      onClick={() => handleIncrement(type)}
                      disabled={count >= cap}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className={styles.actionsFooter}>
          <button className={styles.btnReset} onClick={handleReset}>
            Reset to Default
          </button>
          <button
            className={styles.btnStart}
            onClick={startGame}
            disabled={!isValid}
          >
            Start Match
          </button>
        </div>
      </div>
    </div>
  );
};
export default Deckbuilder;
