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
    winner,
    floatingTexts,
    selectedCardId,
    selectCard,
    playCard,
    playStrikeCard,
    cardTargetSourceId,
    setCardTargetSource,
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
      if (selectedCard.type === 'strike') {
        if (cardTargetSourceId === null) {
          // Select friendly attacker
          if (unitAtCell && unitAtCell.owner === 'player') {
            setCardTargetSource(unitAtCell.id);
          } else {
            selectCard(null); // Cancel
          }
        } else {
          // Select enemy target
          const attacker = units.find(u => u.id === cardTargetSourceId);
          // Check if attacker and target exist and are valid range (respecting invisibility)
          if (attacker && unitAtCell && unitAtCell.owner === 'ai' && !unitAtCell.hasAmbushBuff && isValidActionRange(attacker, x, y, 'attack')) {
            playStrikeCard(selectedCardId, cardTargetSourceId, unitAtCell.id);
          } else {
            selectCard(null); // Cancel
          }
        }
      } else {
        // Single target friendly cards (Mead, Dodge, Steed, Barrage, Enrage, Fortify, Saddle, SecondWind, Ambush, Command, Siege)
        if (unitAtCell && unitAtCell.owner === 'player') {
          playCard(selectedCardId, unitAtCell.id);
        } else {
          selectCard(null); // Cancel
        }
      }
      return;
    }

    // Grid selection & movement logic
    if (!selectedUnit) {
      // No unit selected: select clicked unit if it's friendly (or AI for viewing stats)
      if (unitAtCell) {
        // Only select AI units if they are NOT invisible!
        if (unitAtCell.owner === 'player' || !unitAtCell.hasAmbushBuff) {
          selectUnit(unitAtCell.id);
          if (unitAtCell.owner === 'player' && !unitAtCell.hasActed) {
            setAction('move');
          }
        }
      }
      return;
    }

    // Clicked on a unit (shift selection or toggle)
    if (unitAtCell) {
      // Respect AI invisibility
      if (unitAtCell.owner === 'ai' && unitAtCell.hasAmbushBuff) {
        selectUnit(null);
        return;
      }

      if (unitAtCell.id !== selectedUnit.id) {
        // Select different unit
        selectUnit(unitAtCell.id);
        if (unitAtCell.owner === 'player' && !unitAtCell.hasActed) {
          setAction('move');
        }
      } else {
        // Toggle move overlay for currently selected friendly unit
        if (selectedUnit.owner === 'player' && !selectedUnit.hasActed) {
          setAction(activeAction === 'move' ? null : 'move');
        }
      }
      return;
    }

    // Clicked on empty cell
    if (selectedUnit.owner === 'player' && !selectedUnit.hasActed && activeAction === 'move' && isCellReachable(x, y)) {
      // Execute movement!
      moveUnit(selectedUnit.id, x, y);
    } else {
      // Clicked empty tile that isn't reachable: deselect
      selectUnit(null);
    }
  };

  const strikeAttacker = useMemo(() => {
    if (!cardTargetSourceId) return null;
    return units.find(u => u.id === cardTargetSourceId) || null;
  }, [units, cardTargetSourceId]);

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

            // Card highlight rules
            let isValidAttackTarget = false;
            let isValidHealTarget = false;

            if (selectedCardId && selectedCard) {
              if (selectedCard.type === 'strike') {
                if (cardTargetSourceId === null) {
                  // Highlight valid attacker source units (all player units) in green
                  isValidHealTarget = !!unit && unit.owner === 'player';
                } else if (strikeAttacker) {
                  // Highlight valid attack targets in range in red (respecting invisibility)
                  isValidAttackTarget = !!unit && unit.owner === 'ai' && !unit.hasAmbushBuff && isValidActionRange(strikeAttacker, x, y, 'attack');
                }
              } else {
                // Highlight friendly units in green for single-target friendly cards
                isValidHealTarget = !!unit && unit.owner === 'player';
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
                isValidClearTarget={false}
                isSelected={selectedUnitId === (unit ? unit.id : null) || cardTargetSourceId === (unit ? unit.id : null)}
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
