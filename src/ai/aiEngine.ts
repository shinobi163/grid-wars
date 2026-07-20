import { GameState, useGameStore } from '../store/gameStore';
import { Unit, getMaxHp, hasSpecialEffect } from '../engine/combatResolver';
import { Cell, getManhattanDistance, getReachableCells, isValidActionRange } from '../engine/gameRules';
import { CLASSES } from '../config/unitDefinitions';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function runAiTurn(store: GameState) {
  const {
    units,
    grid,
    endTurn,
    moveUnit,
    buyUpgrade,
    playCard,
    attackUnit,
    healUnit
  } = store;

  // --- AI CARD PLAYING PHASE ---
  // The AI evaluates its hand of cards before doing unit movements
  let hand = [...useGameStore.getState().aiHand];
  
  for (const card of hand) {
    const currentUnits = useGameStore.getState().units;
    const currentGold = useGameStore.getState().resources.ai;
    let played = false;

    // Skip card if AI cannot afford it
    if (currentGold < card.goldCost) {
      continue;
    }



    if (played) {
      await delay(800);
    }
  }

  // --- UNIT ACTION PHASE ---
  let aiUnits = units.filter(u => u.owner === 'ai' && u.hp > 0 && !u.hasActed);

  while (aiUnits.length > 0) {
    const currentUnits = useGameStore.getState().units;
    const currentGrid = useGameStore.getState().grid;

    const aiUnit = currentUnits.find(u => u.id === aiUnits[0].id && !u.hasActed);
    if (!aiUnit) {
      aiUnits.shift();
      continue;
    }

    const tryStandardAction = async (unit: Unit): Promise<boolean> => {
      const unitsState = useGameStore.getState().units;
      const enemies = unitsState.filter(u => u.owner === 'player' && !u.hasAmbushBuff);
      
      if (unit.type === 'archerMedic') {
        const damagedAllies = unitsState.filter(u => u.owner === 'ai' && u.hp > 0 && getMaxHp(u) - u.hp >= 3);
        for (const ally of damagedAllies) {
          if (isValidActionRange(unit, ally.x, ally.y, 'heal')) {
            healUnit(unit.id, ally.id);
            return true;
          }
        }
      }

      for (const enemy of enemies) {
        if (isValidActionRange(unit, enemy.x, enemy.y, 'attack')) {
          attackUnit(unit.id, enemy.id);
          return true;
        }
      }

      return false;
    };

    let acted = await tryStandardAction(aiUnit);
    
    if (!acted) {
      const reachableCells = getReachableCells(aiUnit, currentUnits, currentGrid);
      
      if (reachableCells.length > 0) {
        let bestCell: { x: number; y: number } | null = null;

        if (aiUnit.type === 'scoutMiner') {
          const resourceTiles: Cell[] = [];
          currentGrid.forEach(row => row.forEach(cell => {
            if (cell.type === 'resource') resourceTiles.push(cell);
          }));

          if (resourceTiles.length > 0) {
            let minDistance = Infinity;
            reachableCells.forEach(cell => {
              resourceTiles.forEach(res => {
                const dist = getManhattanDistance(cell.x, cell.y, res.x, res.y);
                if (dist < minDistance) {
                  minDistance = dist;
                  bestCell = cell;
                }
              });
            });
          }
        } else if (aiUnit.type === 'archerMedic') {
          const friendlyOffense = currentUnits.find(u => u.owner === 'ai' && u.type === 'swordsman');
          if (friendlyOffense) {
            let minDistance = Infinity;
            reachableCells.forEach(cell => {
              const distToOffense = getManhattanDistance(cell.x, cell.y, friendlyOffense.x, friendlyOffense.y);
              if (distToOffense < minDistance) {
                minDistance = distToOffense;
                bestCell = cell;
              }
            });
          }
        } else {
          const playerUnits = currentUnits.filter(u => u.owner === 'player' && !u.hasAmbushBuff);
          if (playerUnits.length > 0) {
            let minDistance = Infinity;
            reachableCells.forEach(cell => {
              playerUnits.forEach(p => {
                const dist = getManhattanDistance(cell.x, cell.y, p.x, p.y);
                if (dist < minDistance) {
                  minDistance = dist;
                  bestCell = cell;
                }
              });
            });
          }
        }

        if (bestCell) {
          moveUnit(aiUnit.id, (bestCell as any).x, (bestCell as any).y);
          await delay(800);

          const updatedUnit = useGameStore.getState().units.find(u => u.id === aiUnit!.id);
          if (updatedUnit && !updatedUnit.hasActed) {
            await tryStandardAction(updatedUnit);
            await delay(800);
          }
        } else {
          useGameStore.setState(state => ({
            units: state.units.map(u => u.id === aiUnit!.id ? { ...u, hasActed: true } : u)
          }));
        }
      } else {
        useGameStore.setState(state => ({
          units: state.units.map(u => u.id === aiUnit!.id ? { ...u, hasActed: true } : u)
        }));
      }
    } else {
      await delay(800);
    }

    aiUnits.shift();
  }

  // --- UPGRADE SHOPPING FOR AI ---
  let aiGold = useGameStore.getState().resources.ai;
  const postMoveUnits = useGameStore.getState().units;
  const aiUnitRefs = postMoveUnits.filter(u => u.owner === 'ai' && u.hp > 0);

  for (const u of aiUnitRefs) {
    const tree = CLASSES[u.type].upgradeTree;
    
    for (const node of tree.tier1) {
      if (aiGold >= node.cost && !u.unlockedUpgrades.includes(node.id)) {
        buyUpgrade(u.id, node.id);
        aiGold -= node.cost;
        await delay(500);
      }
    }

    for (const node of tree.tier2) {
      const parentUnlocked = tree.tier1.some(p => u.unlockedUpgrades.includes(p.id));
      if (parentUnlocked && aiGold >= node.cost && !u.unlockedUpgrades.includes(node.id)) {
        buyUpgrade(u.id, node.id);
        aiGold -= node.cost;
        await delay(500);
      }
    }
  }

  await delay(800);
  endTurn();
}

export default runAiTurn;
