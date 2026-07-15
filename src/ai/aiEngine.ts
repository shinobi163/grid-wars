import { GameState, useGameStore } from '../store/gameStore';
import { Unit, getMaxHp, hasSpecialEffect } from '../engine/combatResolver';
import { Cell, getManhattanDistance, getReachableCells, isValidActionRange } from '../engine/gameRules';
import { UPGRADE_TREES } from '../config/upgradeTrees';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function runAiTurn(store: GameState) {
  const {
    units,
    grid,
    endTurn,
    moveUnit,
    buyUpgrade,
    playCard,
    playStrikeCard
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

    if (card.type === 'mead') {
      const damagedAlly = currentUnits.find(u => u.owner === 'ai' && getMaxHp(u) - u.hp >= 3);
      if (damagedAlly) {
        playCard(card.id, damagedAlly.id);
        played = true;
      }
    } else if (card.type === 'dodge') {
      const offenseAlly = currentUnits.find(u => u.owner === 'ai' && u.type === 'offense' && !u.hasMissedBuff);
      if (offenseAlly) {
        playCard(card.id, offenseAlly.id);
        played = true;
      }
    } else if (card.type === 'steed') {
      const squishyAlly = currentUnits.find(
        u => u.owner === 'ai' && (u.type === 'support' || u.type === 'gatherer') && !u.equipment.some(e => e.type === 'steed')
      );
      if (squishyAlly) {
        playCard(card.id, squishyAlly.id);
        played = true;
      }
    } else if (card.type === 'barrage') {
      // Plays barrage centered on AI offense if there is an visible player unit near
      const offenseAlly = currentUnits.find(u => u.owner === 'ai' && u.type === 'offense' && u.hp > 2); // needs > 2 hp to survive recoil
      if (offenseAlly) {
        const playerUnitNear = currentUnits.some(
          u => u.owner === 'player' && !u.hasAmbushBuff && getManhattanDistance(offenseAlly.x, offenseAlly.y, u.x, u.y) <= 2
        );
        if (playerUnitNear) {
          playCard(card.id, offenseAlly.id);
          played = true;
        }
      }
    } else if (card.type === 'enrage') {
      const offenseAlly = currentUnits.find(u => u.owner === 'ai' && u.type === 'offense' && !u.hasEnrageBuff);
      if (offenseAlly) {
        playCard(card.id, offenseAlly.id);
        played = true;
      }
    } else if (card.type === 'fortify') {
      const offenseAlly = currentUnits.find(u => u.owner === 'ai' && u.type === 'offense' && !u.hasFortifyBuff);
      if (offenseAlly) {
        playCard(card.id, offenseAlly.id);
        played = true;
      }
    } else if (card.type === 'saddle') {
      const gathererAlly = currentUnits.find(u => u.owner === 'ai' && u.type === 'gatherer' && !u.hasSaddleBuff);
      if (gathererAlly) {
        playCard(card.id, gathererAlly.id);
        played = true;
      }
    } else if (card.type === 'secondwind') {
      const ally = currentUnits.find(u => u.owner === 'ai' && !u.hasSecondWindBuff);
      if (ally) {
        playCard(card.id, ally.id);
        played = true;
      }
    } else if (card.type === 'ambush') {
      const offenseAlly = currentUnits.find(u => u.owner === 'ai' && u.type === 'offense' && !u.hasAmbushBuff);
      if (offenseAlly) {
        playCard(card.id, offenseAlly.id);
        played = true;
      }
    } else if (card.type === 'command') {
      const ally = currentUnits.find(u => u.owner === 'ai');
      if (ally) {
        playCard(card.id, ally.id);
        played = true;
      }
    } else if (card.type === 'siege') {
      const offenseAlly = currentUnits.find(u => u.owner === 'ai');
      if (offenseAlly) {
        playCard(card.id, offenseAlly.id);
        played = true;
      }
    } else if (card.type === 'strike') {
      // Find an AI unit that is in attack range of a visible player unit
      const attackers = currentUnits.filter(u => u.owner === 'ai');
      const enemies = currentUnits.filter(u => u.owner === 'player' && !u.hasAmbushBuff);
      
      let strikePlayed = false;
      for (const atk of attackers) {
        for (const enemy of enemies) {
          if (isValidActionRange(atk, enemy.x, enemy.y, 'attack') && !strikePlayed) {
            playStrikeCard(card.id, atk.id, enemy.id);
            played = true;
            strikePlayed = true;
            break;
          }
        }
        if (strikePlayed) break;
      }
    }

    if (played) {
      await delay(800);
    }
  }

  // --- UNIT ACTION PHASE ---
  // Default units can ONLY perform movement. They cannot standard-attack or standard-heal.
  let aiUnits = units.filter(u => u.owner === 'ai' && u.hp > 0 && !u.hasActed);

  while (aiUnits.length > 0) {
    const currentUnits = useGameStore.getState().units;
    const currentGrid = useGameStore.getState().grid;

    const aiUnit = currentUnits.find(u => u.id === aiUnits[0].id && !u.hasActed);
    if (!aiUnit) {
      aiUnits.shift();
      continue;
    }

    const reachableCells = getReachableCells(aiUnit, currentUnits, currentGrid);
    
    if (reachableCells.length > 0) {
      let bestCell: { x: number; y: number } | null = null;

      if (aiUnit.type === 'gatherer') {
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
      } else if (aiUnit.type === 'support') {
        const friendlyOffense = currentUnits.find(u => u.owner === 'ai' && u.type === 'offense');
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
        // Offense moves closer to the nearest visible player unit
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
      } else {
        // Mark unit acted even if it stayed in place
        useGameStore.setState(state => ({
          units: state.units.map(u => u.id === aiUnit.id ? { ...u, hasActed: true } : u)
        }));
      }
    } else {
      // Mark unit acted if no moves are reachable
      useGameStore.setState(state => ({
        units: state.units.map(u => u.id === aiUnit.id ? { ...u, hasActed: true } : u)
      }));
    }

    aiUnits.shift();
  }

  // --- UPGRADE SHOPPING FOR AI ---
  let aiGold = useGameStore.getState().resources.ai;
  const postMoveUnits = useGameStore.getState().units;
  const aiUnitRefs = postMoveUnits.filter(u => u.owner === 'ai' && u.hp > 0);

  for (const u of aiUnitRefs) {
    const tree = UPGRADE_TREES[u.type];
    
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
