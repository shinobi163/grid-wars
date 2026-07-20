import React, { useMemo } from 'react';
import styles from './Sidebar.module.css';
import { useGameStore } from '../store/gameStore';
import { GoldIcon } from './UnitIcons';
import { getManhattanDistance } from '../engine/gameRules';
import { CLASSES } from '../config/unitDefinitions';
import { getMaxHp, getAttackPower, getMoveRange } from '../engine/combatResolver';

const BootIconTiny: React.FC<{ size?: number; className?: string }> = ({ size = 10, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  >
    <path d="M21.5 16.5l-4-4.5c-.2-.2-.5-.3-.8-.3h-3.2V5c0-.6-.4-1-1-1H7.5c-.6 0-1 .4-1 1v4.5H5.8c-1 0-1.8.8-1.8 1.8V17c0 1.7 1.3 3 3 3h12.7c1.3 0 2.4-1 2.5-2.3l.3-1.2z" />
  </svg>
);

export const Sidebar: React.FC = () => {
  const {
    units,
    grid,
    currentPlayer,
    resources,
    selectedUnitId,
    activeAction,
    setAction,
    endTurn,
    actionLog,
    turnNumber,
    winner,
    turnRecap
  } = useGameStore();

  const selectedUnit = useMemo(() => {
    return units.find(u => u.id === selectedUnitId);
  }, [units, selectedUnitId]);

  // Check if selected unit has adjacent obstacles
  const hasAdjacentObstacle = useMemo(() => {
    if (!selectedUnit) return false;
    const dirs = [
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 }
    ];
    return dirs.some(d => {
      const nx = selectedUnit.x + d.dx;
      const ny = selectedUnit.y + d.dy;
      return nx >= 0 && nx < 8 && ny >= 0 && ny < 8 && grid[ny][nx].hasObstacle;
    });
  }, [selectedUnit, grid]);

  const isPlayerTurn = currentPlayer === 'player';
  const unitCanAct = selectedUnit && selectedUnit.owner === 'player' && !selectedUnit.hasActed && !winner;

  return (
    <div className={styles.sidebar}>
      {/* Turn Control Card */}
      <div className={styles.card}>
        <div className={styles.turnHeader}>
          <span className={styles.turnTitle}>Game Status</span>
          <span className={styles.turnNum}>Turn {turnNumber}</span>
        </div>

        <div
          className={`
            ${styles.currentPlayerBadge}
            ${isPlayerTurn ? styles.playerActive : styles.aiActive}
          `}
        >
          {winner
            ? `Winner: ${winner === 'player' ? 'Player' : 'AI'}`
            : isPlayerTurn
            ? 'Player Turn'
            : 'AI Thinking...'}
        </div>

        <button
          className={styles.btnEndTurn}
          onClick={endTurn}
          disabled={!isPlayerTurn || !!winner}
        >
          End Turn
        </button>
      </div>

      {/* Selected Unit Attributes Card */}
      {selectedUnit && (
        <div
          className={styles.card}
          style={{
            borderColor: selectedUnit.owner === 'player' ? 'var(--player-color)' : 'var(--ai-color)',
            boxShadow: `0 0 10px ${selectedUnit.owner === 'player' ? 'var(--player-glow)' : 'var(--ai-glow)'}`
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#7b8580', letterSpacing: '0.5px', marginBottom: '8px' }}>
            Selected Unit Details
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffffff' }}>
              {CLASSES[selectedUnit.type].name}
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 'bold',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: selectedUnit.owner === 'player' ? 'rgba(76, 217, 100, 0.15)' : 'rgba(255, 59, 48, 0.15)',
                color: selectedUnit.owner === 'player' ? 'var(--player-color)' : 'var(--ai-color)'
              }}
            >
              {selectedUnit.owner === 'player' ? 'Player' : 'Enemy AI'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', backgroundColor: 'rgba(0, 0, 0, 0.25)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '9px', color: '#7b8580', textTransform: 'uppercase' }}>HP</span>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#ffffff', marginTop: '2px' }}>
                {selectedUnit.hp} / {getMaxHp(selectedUnit)}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '9px', color: '#7b8580', textTransform: 'uppercase' }}>Attack</span>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#ff3b30', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                {getAttackPower(selectedUnit)}
                {selectedUnit.hasEnrageBuff && <span style={{ fontSize: '9px', color: '#4cd964' }}>(+2)</span>}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '9px', color: '#7b8580', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '2px' }}>
                <BootIconTiny size={8} /> Move
              </span>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#ffcc00', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                {getMoveRange(selectedUnit)}
                {selectedUnit.hasSaddleBuff && <span style={{ fontSize: '9px', color: '#4cd964' }}>(+1)</span>}
              </span>
            </div>
          </div>

          {/* Action Economy Buttons */}
          {isPlayerTurn && selectedUnit.owner === 'player' && !selectedUnit.hasActed && !winner && (
            <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#7b8580', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                Select Action
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setAction(activeAction === 'move' ? null : 'move')}
                  style={{
                    flex: '1 1 calc(50% - 3px)',
                    padding: '6px 8px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backgroundColor: activeAction === 'move' ? 'rgba(229,176,97,0.2)' : 'rgba(0,0,0,0.3)',
                    color: activeAction === 'move' ? 'var(--gold-color)' : '#ffffff',
                    borderColor: activeAction === 'move' ? 'var(--gold-color)' : 'rgba(255,255,255,0.1)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  🥾 Move
                </button>
                <button
                  onClick={() => setAction(activeAction === 'attack' ? null : 'attack')}
                  style={{
                    flex: '1 1 calc(50% - 3px)',
                    padding: '6px 8px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backgroundColor: activeAction === 'attack' ? 'rgba(255,59,48,0.2)' : 'rgba(0,0,0,0.3)',
                    color: activeAction === 'attack' ? '#ff3b30' : '#ffffff',
                    borderColor: activeAction === 'attack' ? '#ff3b30' : 'rgba(255,255,255,0.1)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  ⚔️ Attack
                </button>
                {CLASSES[selectedUnit.type].canHeal && (
                  <button
                    onClick={() => setAction(activeAction === 'heal' ? null : 'heal')}
                    style={{
                      flex: '1 1 calc(50% - 3px)',
                      padding: '6px 8px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      border: '1px solid rgba(255,255,255,0.1)',
                      backgroundColor: activeAction === 'heal' ? 'rgba(76,217,100,0.2)' : 'rgba(0,0,0,0.3)',
                      color: activeAction === 'heal' ? '#4cd964' : '#ffffff',
                      borderColor: activeAction === 'heal' ? '#4cd964' : 'rgba(255,255,255,0.1)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    💚 Heal
                  </button>
                )}
                {CLASSES[selectedUnit.type].canClearObstacles && (
                  <button
                    onClick={() => setAction(activeAction === 'clear' ? null : 'clear')}
                    style={{
                      flex: '1 1 calc(50% - 3px)',
                      padding: '6px 8px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      border: '1px solid rgba(255,255,255,0.1)',
                      backgroundColor: activeAction === 'clear' ? 'rgba(255,204,0,0.2)' : 'rgba(0,0,0,0.3)',
                      color: activeAction === 'clear' ? '#ffcc00' : '#ffffff',
                      borderColor: activeAction === 'clear' ? '#ffcc00' : 'rgba(255,255,255,0.1)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    🧱 Clear
                  </button>
                )}
              </div>
              {activeAction && (
                <div style={{ fontSize: '10px', color: '#a0a8a3', marginTop: '8px', fontStyle: 'italic', textAlign: 'center' }}>
                  {activeAction === 'move' && 'Click a highlighted green cell to move.'}
                  {activeAction === 'attack' && 'Click a highlighted red cell to attack.'}
                  {activeAction === 'heal' && 'Click a highlighted green cell to heal.'}
                  {activeAction === 'clear' && 'Click an adjacent boulder to clear it.'}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Gold Resources Card */}
      <div className={styles.card}>
        <div className={styles.resourcesGrid}>
          <div className={styles.resBox}>
            <div className={styles.resLabel}>Your Gold</div>
            <div className={`${styles.resVal} ${styles.playerVal}`}>
              <GoldIcon size={18} />
              <span>{resources.player}g</span>
            </div>
          </div>
          <div className={styles.resBox}>
            <div className={styles.resLabel}>AI Gold</div>
            <div className={`${styles.resVal} ${styles.aiVal}`}>
              <GoldIcon size={18} />
              <span>{resources.ai}g</span>
            </div>
          </div>
        </div>
      </div>

      {/* Enemy Turn Recap (Visible on player's turn when recap exists) */}
      {isPlayerTurn && turnRecap.length > 0 && (
        <div className={styles.card} style={{ borderColor: 'var(--ai-color)', backgroundColor: 'rgba(184, 92, 92, 0.05)' }}>
          <div className={styles.actionsTitle} style={{ color: 'var(--ai-color)' }}>Enemy Turn Recap</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#a0a8a3' }}>
            {turnRecap.map((log, index) => (
              <div key={index} style={{ borderLeft: '2px solid var(--ai-color)', paddingLeft: '8px' }}>
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log Feed */}
      <div className={`${styles.card} ${styles.logContainer}`}>
        <div className={styles.logTitle}>Battle Log</div>
        <div className={styles.logList}>
          {actionLog.map((log, index) => (
            <div key={index} className={styles.logItem}>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default Sidebar;
