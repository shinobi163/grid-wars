import React, { useMemo } from 'react';
import styles from './Board.module.css';
import { useGameStore } from '../store/gameStore';
import { Cell } from './Cell';
import { getReachableCells, isValidActionRange, getUnitAt, getManhattanDistance } from '../engine/gameRules';
import { GoldIcon } from './UnitIcons';

export const Board: React.FC = () => {
  const {
    grid,
    units,
    currentPlayer,
    selectedUnitId,
    activeAction,
    selectUnit,
    setAction,
    moveUnit,
    attackUnit,
    healUnit,
    clearObstacle,
    winner,
    floatingTexts,
    selectedCardId,
    selectCard,
    playCard,
    playerHand,
    resources,
    turnNumber
  } = useGameStore();

  const selectedUnit = useMemo(() => {
    return units.find(u => u.id === selectedUnitId);
  }, [units, selectedUnitId]);

  const selectedCard = useMemo(() => {
    return playerHand.find(c => c.id === selectedCardId);
  }, [playerHand, selectedCardId]);

  // Compute reachable cells for the selected unit
  const reachableCells = useMemo(() => {
    if (!selectedUnit || selectedUnit.owner !== 'player' || selectedUnit.hasActed || activeAction !== 'move') {
      return [];
    }
    return getReachableCells(selectedUnit, units, grid);
  }, [selectedUnit, units, grid, activeAction]);

  const isCellReachable = (x: number, y: number) => {
    return reachableCells.some(c => c.x === x && c.y === y);
  };

  const handleCellClick = (x: number, y: number) => {
    if (winner || currentPlayer !== 'player') return;

    const unitAtCell = getUnitAt(x, y, units);
    const cell = grid[y][x];

    // Card playing takes precedence!
    if (selectedCardId && selectedCard) {
      if (unitAtCell && unitAtCell.owner === 'player') {
        playCard(selectedCardId, unitAtCell.id);
      } else {
        selectCard(null); // Cancel
      }
      return;
    }

    // Default Action execution
    if (selectedUnit && selectedUnit.owner === 'player' && !selectedUnit.hasActed) {
      if (activeAction === 'move' && isCellReachable(x, y) && !unitAtCell) {
        moveUnit(selectedUnit.id, x, y);
        return;
      }

      if (activeAction === 'attack' && unitAtCell && unitAtCell.owner === 'ai' && !unitAtCell.hasAmbushBuff) {
        if (isValidActionRange(selectedUnit, x, y, 'attack')) {
          attackUnit(selectedUnit.id, unitAtCell.id);
          return;
        }
      }

      if (activeAction === 'heal' && unitAtCell && unitAtCell.owner === 'player') {
        if (isValidActionRange(selectedUnit, x, y, 'heal')) {
          healUnit(selectedUnit.id, unitAtCell.id);
          return;
        }
      }

      if (activeAction === 'clear' && cell.hasObstacle) {
        const dist = getManhattanDistance(selectedUnit.x, selectedUnit.y, x, y);
        if (dist === 1) {
          clearObstacle(selectedUnit.id, x, y);
          return;
        }
      }
    }

    // Grid selection & shift selection logic
    if (unitAtCell) {
      if (unitAtCell.owner === 'player' || !unitAtCell.hasAmbushBuff) {
        selectUnit(unitAtCell.id);
        if (unitAtCell.owner === 'player' && !unitAtCell.hasActed) {
          setAction('move');
        }
      }
    } else {
      selectUnit(null);
    }
  };

  return (
    <div className={styles.boardContainer}>
      {/* Top Header HUD Display Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '14px', padding: '0 8px' }}>
        <div style={{ color: 'var(--player-color)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
          <GoldIcon size={16} /> Player Gold: {resources.player}g
        </div>
        <div style={{ color: 'var(--gold-color)', fontWeight: 'bold', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Turn {turnNumber}
        </div>
        <div style={{ color: 'var(--ai-color)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
          <GoldIcon size={16} /> AI Gold: {resources.ai}g
        </div>
      </div>

      <div className={styles.grid}>
        {grid.map((row, y) =>
          row.map((cell, x) => {
            const unit = getUnitAt(x, y, units);
            const isReachable = isCellReachable(x, y);

            // Card / Action highlight rules
            let isValidAttackTarget = false;
            let isValidHealTarget = false;
            let isValidClearTarget = false;

            if (selectedCardId && selectedCard) {
              // Highlight friendly units in green for single-target friendly cards
              isValidHealTarget = !!unit && unit.owner === 'player';
            } else if (selectedUnit && !selectedUnit.hasActed && selectedUnit.owner === 'player') {
              if (activeAction === 'attack') {
                isValidAttackTarget = !!unit && unit.owner === 'ai' && !unit.hasAmbushBuff && isValidActionRange(selectedUnit, x, y, 'attack');
              } else if (activeAction === 'heal') {
                isValidHealTarget = !!unit && unit.owner === 'player' && isValidActionRange(selectedUnit, x, y, 'heal');
              } else if (activeAction === 'clear') {
                isValidClearTarget = cell.hasObstacle && getManhattanDistance(selectedUnit.x, selectedUnit.y, x, y) === 1;
              }
            }

            return (
              <Cell
                key={`${x}-${y}`}
                cell={cell}
                unit={unit}
                isReachable={isReachable}
                isValidAttackTarget={isValidAttackTarget}
                isValidHealTarget={isValidHealTarget}
                isValidClearTarget={isValidClearTarget}
                isSelected={selectedUnitId === (unit ? unit.id : null)}
                onCellClick={() => handleCellClick(x, y)}
              />
            );
          })
        )}
      </div>

      {/* Floating combat numbers */}
      {floatingTexts.map(t => {
        const left = t.x * 12.5 + 6.25;
        const top = t.y * 12.5 + 6.25;
        const typeClass = t.type === 'damage' ? 'floatDamage' : t.type === 'heal' ? 'floatHeal' : 'floatStatus';
        return (
          <div
            key={t.id}
            className={`floatingText ${typeClass}`}
            style={{ left: `${left}%`, top: `${top}%`, transform: 'translate(-50%, -50%)' }}
          >
            {t.text}
          </div>
        );
      })}
    </div>
  );
};
export default Board;
