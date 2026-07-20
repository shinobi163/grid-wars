'use client';

import React, { useEffect, useRef } from 'react';
import styles from './GameContainer.module.css';
import { useGameStore } from '../store/gameStore';
import Board from './Board';
import Sidebar from './Sidebar';
import UpgradePanel from './UpgradePanel';
import runAiTurn from '../ai/aiEngine';
import CardsHand from './CardsHand';
import Deckbuilder from './Deckbuilder';

export const GameContainer: React.FC = () => {
  const store = useGameStore();
  const { initGame, currentPlayer, winner, turnNumber, showTurnBanner, gameState } = store;
  
  // Prevent double AI executions in React StrictMode
  const aiTurnExecutedRef = useRef<number | null>(null);

  // Initialize game on mount
  useEffect(() => {
    // We only initialize the game if it is already playing
    if (gameState === 'playing') {
      initGame('ai');
    }
  }, [initGame, gameState]);

  // AI Turn Trigger Effect
  useEffect(() => {
    if (currentPlayer === 'ai' && !winner && !showTurnBanner) {
      // Check if we already executed the AI logic for this turn
      if (aiTurnExecutedRef.current !== turnNumber) {
        aiTurnExecutedRef.current = turnNumber;
        runAiTurn(useGameStore.getState());
      }
    }
  }, [currentPlayer, winner, turnNumber, showTurnBanner]);

  return (
    <div className={styles.container}>
      {/* Top Header Controls */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <h1 className={styles.logo}>Grid Tactics</h1>
          <span className={styles.tagline}>Turn-Based Strategy MVP</span>
        </div>
        <div className={styles.controls}>
          <button className={styles.btnReset} onClick={() => initGame('ai')}>
            Restart Game
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      {gameState === 'setup' ? (
        <Deckbuilder />
      ) : (
        <main className={styles.mainLayout}>
          {/* Left Column: Game controls & Logs */}
          <section className="glass-panel">
            <Sidebar />
          </section>

          {/* Center Column: Tactical Grid */}
          <section className={styles.boardSection}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Board />

              {/* Game Over Screen Overlay */}
              {winner && (
                <div className={`${styles.winnerOverlay} ${winner === 'player' ? styles.playerWin : styles.aiWin}`}>
                  <h2 className={styles.winnerText}>
                    {winner === 'player' ? 'Victory!' : 'Defeat!'}
                  </h2>
                  <p className={styles.winnerSubtext}>
                    {winner === 'player'
                      ? 'You successfully defeated the AI forces.'
                      : 'The enemy has overrun your troops.'}
                  </p>
                  <button className={styles.btnReplay} onClick={() => { useGameStore.setState({ gameState: 'setup' }); }}>
                    Play Again
                  </button>
                </div>
              )}
            </div>
            <CardsHand />
          </section>

          {/* Right Column: Upgrade panel */}
          <section className="glass-panel" style={{ height: '100%' }}>
            <UpgradePanel />
          </section>
        </main>
      )}

      {/* Turn Transition Banner Overlay */}
      {showTurnBanner && (
        <div
          className="turnBanner"
          style={{
            '--banner-color': showTurnBanner === 'player' ? 'var(--player-color)' : 'var(--ai-color)',
            '--banner-glow': showTurnBanner === 'player' ? 'var(--player-glow)' : 'var(--ai-glow)'
          } as React.CSSProperties}
        >
          <div className="turnBannerCard">
            <h2 className="turnBannerTitle">
              {showTurnBanner === 'player' ? 'Your Turn' : 'Enemy Turn'}
            </h2>
            <p className="turnBannerSubtitle">
              {showTurnBanner === 'player' ? 'Draw 2 cards' : 'AI executing commands'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
export default GameContainer;
