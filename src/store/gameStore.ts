import { create } from 'zustand';
import { UnitType, UNIT_REGISTRY } from '../config/unitDefinitions';
import { UPGRADE_TREES, UpgradeNode } from '../config/upgradeTrees';
import { TileType, TERRAIN_REGISTRY } from '../config/terrainRules';
import { Card, CardType, CARD_TEMPLATES, generateDeck } from '../config/cardTemplates';
import {
  Unit,
  getMaxHp,
  resolveCombat,
  hasSpecialEffect,
  getUnlockedUpgradeNodes
} from '../engine/combatResolver';
import {
  Cell,
  getUnitAt,
  getReachableCells,
  isValidActionRange,
  getManhattanDistance
} from '../engine/gameRules';

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  type: 'damage' | 'heal' | 'status';
}

export interface GameState {
  grid: Cell[][];
  units: Unit[];
  currentPlayer: 'player' | 'ai';
  resources: Record<'player' | 'ai', number>;
  selectedUnitId: string | null;
  activeAction: 'move' | 'attack' | 'heal' | 'clear' | null;
  winner: 'player' | 'ai' | null;
  actionLog: string[];
  turnNumber: number;
  gameMode: 'ai' | 'passAndPlay';
  
  // Card System State
  deck: CardType[];
  discardPile: CardType[];
  playerHand: Card[];
  aiHand: Card[];
  selectedCardId: string | null;
  cardTargetSourceId: string | null; // Attacker source unit for Strike card
  attacksThisTurn: number;
  
  // Visual Feedback State
  floatingTexts: FloatingText[];
  turnRecap: string[];
  showTurnBanner: 'player' | 'ai' | null;

  // Actions
  initGame: (mode?: 'ai' | 'passAndPlay') => void;
  selectUnit: (unitId: string | null) => void;
  setAction: (action: 'move' | 'attack' | 'heal' | 'clear' | null) => void;
  moveUnit: (unitId: string, toX: number, toY: number) => void;
  attackUnit: (attackerId: string, defenderId: string) => void;
  healUnit: (healerId: string, targetId: string) => void;
  clearObstacle: (unitId: string, cellX: number, cellY: number) => void;
  buyUpgrade: (unitId: string, upgradeId: string) => void;
  endTurn: () => void;
  addLog: (message: string) => void;
  
  // Card Actions
  selectCard: (cardId: string | null) => void;
  setCardTargetSource: (unitId: string | null) => void;
  playCard: (cardId: string, targetUnitId: string) => void;
  playStrikeCard: (cardId: string, attackerId: string, defenderId: string) => void;
  drawCard: (owner: 'player' | 'ai') => void;
  drawUpTo: (owner: 'player' | 'ai') => void;
  
  // Feedback Actions
  addFloatingText: (x: number, y: number, text: string, type: 'damage' | 'heal' | 'status') => void;
  removeFloatingText: (id: string) => void;
  setTurnBanner: (banner: 'player' | 'ai' | null) => void;
  addRecap: (message: string) => void;
}

const damageUnitHelper = (
  u: Unit,
  damage: number,
  addLog: (m: string) => void,
  addFloatingText: (x: number, y: number, text: string, type: 'damage' | 'heal' | 'status') => void
): Unit => {
  let nextHp = u.hp - damage;
  if (nextHp <= 0) {
    if (u.hasSecondWindBuff) {
      addLog(`Second Wind! ${UNIT_REGISTRY[u.type].displayName} survived fatal damage and revived with 3 HP!`);
      addFloatingText(u.x, u.y, 'REVIVED!', 'status');
      return {
        ...u,
        hp: 3,
        hasSecondWindBuff: false
      };
    } else {
      return { ...u, hp: 0 };
    }
  }
  return { ...u, hp: nextHp };
};

export const useGameStore = create<GameState>((set, get) => ({
  grid: [],
  units: [],
  currentPlayer: 'player',
  resources: { player: 0, ai: 0 },
  selectedUnitId: null,
  activeAction: null,
  winner: null,
  actionLog: [],
  turnNumber: 1,
  gameMode: 'ai',
  
  // Card System State
  deck: [],
  discardPile: [],
  playerHand: [],
  aiHand: [],
  selectedCardId: null,
  cardTargetSourceId: null,
  attacksThisTurn: 0,
  
  // Feedback State
  floatingTexts: [],
  turnRecap: [],
  showTurnBanner: null,

  addLog: (message: string) => {
    set(state => ({
      actionLog: [message, ...state.actionLog].slice(0, 50)
    }));
  },

  addRecap: (message: string) => {
    set(state => ({
      turnRecap: [...state.turnRecap, message]
    }));
  },

  setTurnBanner: (banner) => set({ showTurnBanner: banner }),

  addFloatingText: (x, y, text, type) => {
    const id = `${Date.now()}-${Math.random()}`;
    const newText: FloatingText = { id, x, y, text, type };
    set(state => ({
      floatingTexts: [...state.floatingTexts, newText]
    }));

    setTimeout(() => {
      get().removeFloatingText(id);
    }, 900);
  },

  removeFloatingText: (id) => {
    set(state => ({
      floatingTexts: state.floatingTexts.filter(t => t.id !== id)
    }));
  },

  initGame: (mode = 'ai') => {
    const boardSize = 8;
    const grid: Cell[][] = [];

    // Initialize 8x8 grass grid
    for (let y = 0; y < boardSize; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < boardSize; x++) {
        row.push({
          x,
          y,
          type: 'grass',
          hasObstacle: false
        });
      }
      grid.push(row);
    }

    // Set HQ bases
    grid[7][3].type = 'base'; // Player base
    grid[0][4].type = 'base'; // AI base

    // Preset mountains
    const mountainCoords = [
      { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 5, y: 6 }, { x: 6, y: 6 },
      { x: 1, y: 4 }, { x: 6, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 4 }
    ];
    mountainCoords.forEach(c => {
      grid[c.y][c.x].type = 'mountain';
    });

    // Preset resource tiles
    const resourceCoords = [
      { x: 0, y: 3 }, { x: 7, y: 4 }, { x: 2, y: 4 }, { x: 5, y: 3 }
    ];
    resourceCoords.forEach(c => {
      grid[c.y][c.x].type = 'resource';
    });

    // Preset destructible obstacles
    const obstacleCoords = [
      { x: 2, y: 2 }, { x: 5, y: 5 }, { x: 3, y: 5 }, { x: 4, y: 2 },
      { x: 1, y: 3 }, { x: 6, y: 4 }
    ];
    obstacleCoords.forEach(c => {
      grid[c.y][c.x].hasObstacle = true;
    });

    // Initialize units
    const units: Unit[] = [
      {
        id: 'player_offense',
        type: 'offense',
        owner: 'player',
        x: 2,
        y: 6,
        hp: UNIT_REGISTRY.offense.maxHp,
        hasActed: false,
        unlockedUpgrades: [],
        shieldActive: false,
        equipment: [],
        statusEffects: [],
        hasMissedBuff: false,
        hasEnrageBuff: false,
        hasFortifyBuff: false,
        hasSaddleBuff: false,
        hasSecondWindBuff: false,
        hasAmbushBuff: false
      },
      {
        id: 'player_support',
        type: 'support',
        owner: 'player',
        x: 3,
        y: 6,
        hp: UNIT_REGISTRY.support.maxHp,
        hasActed: false,
        unlockedUpgrades: [],
        shieldActive: false,
        equipment: [],
        statusEffects: [],
        hasMissedBuff: false,
        hasEnrageBuff: false,
        hasFortifyBuff: false,
        hasSaddleBuff: false,
        hasSecondWindBuff: false,
        hasAmbushBuff: false
      },
      {
        id: 'player_gatherer',
        type: 'gatherer',
        owner: 'player',
        x: 4,
        y: 6,
        hp: UNIT_REGISTRY.gatherer.maxHp,
        hasActed: false,
        unlockedUpgrades: [],
        shieldActive: false,
        equipment: [],
        statusEffects: [],
        hasMissedBuff: false,
        hasEnrageBuff: false,
        hasFortifyBuff: false,
        hasSaddleBuff: false,
        hasSecondWindBuff: false,
        hasAmbushBuff: false
      },
      {
        id: 'ai_offense',
        type: 'offense',
        owner: 'ai',
        x: 5,
        y: 1,
        hp: UNIT_REGISTRY.offense.maxHp,
        hasActed: false,
        unlockedUpgrades: [],
        shieldActive: false,
        equipment: [],
        statusEffects: [],
        hasMissedBuff: false,
        hasEnrageBuff: false,
        hasFortifyBuff: false,
        hasSaddleBuff: false,
        hasSecondWindBuff: false,
        hasAmbushBuff: false
      },
      {
        id: 'ai_support',
        type: 'support',
        owner: 'ai',
        x: 4,
        y: 1,
        hp: UNIT_REGISTRY.support.maxHp,
        hasActed: false,
        unlockedUpgrades: [],
        shieldActive: false,
        equipment: [],
        statusEffects: [],
        hasMissedBuff: false,
        hasEnrageBuff: false,
        hasFortifyBuff: false,
        hasSaddleBuff: false,
        hasSecondWindBuff: false,
        hasAmbushBuff: false
      },
      {
        id: 'ai_gatherer',
        type: 'gatherer',
        owner: 'ai',
        x: 3,
        y: 1,
        hp: UNIT_REGISTRY.gatherer.maxHp,
        hasActed: false,
        unlockedUpgrades: [],
        shieldActive: false,
        equipment: [],
        statusEffects: [],
        hasMissedBuff: false,
        hasEnrageBuff: false,
        hasFortifyBuff: false,
        hasSaddleBuff: false,
        hasSecondWindBuff: false,
        hasAmbushBuff: false
      }
    ];

    const fullDeck = generateDeck();
    
    set({
      grid,
      units,
      currentPlayer: 'player',
      resources: { player: 0, ai: 0 },
      selectedUnitId: null,
      activeAction: null,
      winner: null,
      actionLog: ['Game started! Draw up to 5 cards.'],
      turnNumber: 1,
      gameMode: mode,
      
      // Card states
      deck: fullDeck,
      discardPile: [],
      playerHand: [],
      aiHand: [],
      selectedCardId: null,
      cardTargetSourceId: null,
      attacksThisTurn: 0,
      
      // Feedback states
      floatingTexts: [],
      turnRecap: ['Initial deploy completed.'],
      showTurnBanner: 'player'
    });

    // Unified draw up to 5 cards initial action
    get().drawUpTo('player');
    get().drawUpTo('ai');

    setTimeout(() => {
      if (get().showTurnBanner === 'player') {
        set({ showTurnBanner: null });
      }
    }, 1500);
  },

  selectUnit: (unitId) => {
    set({ selectedUnitId: unitId, activeAction: null, selectedCardId: null, cardTargetSourceId: null });
  },

  setAction: (action) => {
    set({ activeAction: action, selectedCardId: null, cardTargetSourceId: null });
  },

  moveUnit: (unitId, toX, toY) => {
    const { units, grid } = get();
    const unit = units.find(u => u.id === unitId);
    if (!unit || unit.hasActed) return;

    const reachable = getReachableCells(unit, units, grid);
    const isReachable = reachable.some(c => c.x === toX && c.y === toY);
    if (!isReachable) return;

    const hasDouble = hasSpecialEffect(unit, 'doubleAction');
    const hiddenEnemy = units.find(u => u.x === toX && u.y === toY && u.owner !== unit.owner && u.hasAmbushBuff);

    let finalX = toX;
    let finalY = toY;
    let collisionMsg = '';
    let updatedUnits = [...units];

    if (hiddenEnemy) {
      const distLeft = getManhattanDistance(unit.x, unit.y, toX - 1, toY);
      const distRight = getManhattanDistance(unit.x, unit.y, toX + 1, toY);
      const distUp = getManhattanDistance(unit.x, unit.y, toX, toY - 1);
      const distDown = getManhattanDistance(unit.x, unit.y, toX, toY + 1);

      let candidates = [
        { x: toX - 1, y: toY, dist: distLeft },
        { x: toX + 1, y: toY, dist: distRight },
        { x: toX, y: toY - 1, dist: distUp },
        { x: toX, y: toY + 1, dist: distDown }
      ].filter(c => c.x >= 0 && c.x < 8 && c.y >= 0 && c.y < 8 && !grid[c.y][c.x].hasObstacle && !getUnitAt(c.x, c.y, units));

      candidates.sort((a, b) => a.dist - b.dist);
      if (candidates.length > 0) {
        finalX = candidates[0].x;
        finalY = candidates[0].y;
      } else {
        finalX = unit.x;
        finalY = unit.y;
      }

      collisionMsg = `Bumped! ${UNIT_REGISTRY[unit.type].displayName} collided with hidden enemy ${UNIT_REGISTRY[hiddenEnemy.type].displayName}! Stealth broken.`;

      updatedUnits = units.map(u => {
        if (u.id === hiddenEnemy.id) {
          return { ...u, hasAmbushBuff: false };
        }
        if (u.id === unitId) {
          return {
            ...u,
            x: finalX,
            y: finalY,
            hasActed: true,
            hasAmbushBuff: false
          };
        }
        return u;
      });
    } else {
      updatedUnits = units.map(u => {
        if (u.id === unitId) {
          return {
            ...u,
            x: toX,
            y: toY,
            hasActed: hasDouble ? false : true,
            hasAmbushBuff: false
          };
        }
        return u;
      });
    }

    set({
      units: updatedUnits,
      selectedUnitId: unitId,
      activeAction: null
    });

    if (hiddenEnemy) {
      get().addLog(collisionMsg);
      get().addFloatingText(hiddenEnemy.x, hiddenEnemy.y, 'REVEALED!', 'status');
      if (unit.owner === 'ai') {
        get().addRecap(collisionMsg);
      }
    } else {
      const msg = `${UNIT_REGISTRY[unit.type].displayName} moved to (${toX}, ${toY}).`;
      get().addLog(msg);
      if (unit.owner === 'ai') {
        get().addRecap(msg);
      }
    }
  },


  attackUnit: (attackerId, defenderId) => {
    const { units, grid } = get();
    const attacker = units.find(u => u.id === attackerId);
    const defender = units.find(u => u.id === defenderId);

    if (!attacker || !defender || attacker.hasActed) return;

    const hasSteed = defender.equipment.some(e => e.type === 'steed');
    const actualDistance = getManhattanDistance(attacker.x, attacker.y, defender.x, defender.y);
    const effectiveDistance = hasSteed ? actualDistance + 1 : actualDistance;

    if (!isValidActionRange(attacker, defender.x, defender.y, 'attack')) return;

    const defenderTerrain = grid[defender.y][defender.x].type;

    if (defender.hasMissedBuff) {
      const updatedUnits = units.map(u => {
        if (u.id === defenderId) {
          return { ...u, hasMissedBuff: false };
        }
        if (u.id === attackerId) {
          return { ...u, hasActed: true, hasAmbushBuff: false };
        }
        return u;
      });

      set({ units: updatedUnits, selectedUnitId: null, activeAction: null });
      get().addLog(`Attack Dodged! ${UNIT_REGISTRY[defender.type].displayName} avoided the hit.`);
      get().addFloatingText(defender.x, defender.y, 'DODGED!', 'status');
      if (attacker.owner === 'ai') {
        get().addRecap(`AI attacked ${UNIT_REGISTRY[defender.type].displayName} but it was DODGED.`);
      }
      return;
    }

    const result = resolveCombat({
      attacker,
      defender,
      distance: effectiveDistance,
      defenderTerrain
    });

    let updatedUnits = units.map(u => {
      if (u.id === defenderId) {
        let afterDamage = damageUnitHelper(u, result.damageDealt, get().addLog, get().addFloatingText);
        return {
          ...afterDamage,
          shieldActive: result.shieldBlocked ? false : u.shieldActive
        };
      }
      if (u.id === attackerId) {
        let afterDamage = damageUnitHelper(u, result.retaliateDamage, get().addLog, get().addFloatingText);
        return {
          ...afterDamage,
          hasActed: true,
          hasAmbushBuff: false // Ambush broken by attack!
        };
      }
      return u;
    });

    updatedUnits = updatedUnits.filter(u => u.hp > 0);

    set({
      units: updatedUnits,
      selectedUnitId: null,
      activeAction: null
    });

    get().addLog(result.logMessage);
    get().addFloatingText(defender.x, defender.y, `-${result.damageDealt}`, 'damage');

    if (attacker.owner === 'ai') {
      get().addRecap(`AI attacked ${UNIT_REGISTRY[defender.type].displayName} for ${result.damageDealt} damage.`);
    }

    if (result.retaliateDamage > 0) {
      get().addLog(`${UNIT_REGISTRY[attacker.type].displayName} took ${result.retaliateDamage} retaliatory damage!`);
      get().addFloatingText(attacker.x, attacker.y, `-${result.retaliateDamage}`, 'damage');
    }

    const playerAlive = updatedUnits.some(u => u.owner === 'player');
    const aiAlive = updatedUnits.some(u => u.owner === 'ai');

    if (!playerAlive) {
      set({ winner: 'ai' });
      get().addLog('Defeat! The AI has eliminated all your units.');
    } else if (!aiAlive) {
      set({ winner: 'player' });
      get().addLog('Victory! You have eliminated all enemy units.');
    }
  },

  healUnit: (healerId, targetId) => {
    const { units } = get();
    const healer = units.find(u => u.id === healerId);
    const target = units.find(u => u.id === targetId);

    if (!healer || !target || healer.hasActed) return;

    if (!isValidActionRange(healer, target.x, target.y, 'heal')) return;

    const maxTargetHp = getMaxHp(target);
    const baseHeal = 3;
    const bonus = getUnlockedUpgradeNodes(healer).reduce((acc, node) => acc + (node.statBonus.healPower || 0), 0);
    const healAmount = baseHeal + bonus;

    const updatedUnits = units.map(u => {
      if (u.id === targetId) {
        return {
          ...u,
          hp: Math.min(maxTargetHp, u.hp + healAmount)
        };
      }
      if (u.id === healerId) {
        return {
          ...u,
          hasActed: true,
          hasAmbushBuff: false // Breaks invisibility
        };
      }
      return u;
    });

    set({
      units: updatedUnits,
      selectedUnitId: null,
      activeAction: null
    });

    const msg = `${UNIT_REGISTRY[healer.type].displayName} healed ${UNIT_REGISTRY[target.type].displayName} for ${healAmount} HP.`;
    get().addLog(msg);
    get().addFloatingText(target.x, target.y, `+${healAmount}`, 'heal');
    if (healer.owner === 'ai') {
      get().addRecap(msg);
    }
  },

  clearObstacle: (unitId, cellX, cellY) => {
    const { units, grid, resources, currentPlayer } = get();
    const unit = units.find(u => u.id === unitId);
    if (!unit || unit.hasActed) return;

    const dist = getManhattanDistance(unit.x, unit.y, cellX, cellY);
    if (dist !== 1 || !grid[cellY][cellX].hasObstacle) return;

    const updatedGrid = grid.map((row, y) =>
      row.map((cell, x) => {
        if (x === cellX && y === cellY) {
          return { ...cell, hasObstacle: false };
        }
        return cell;
      })
    );

    const currentGold = resources[currentPlayer];

    const updatedUnits = units.map(u => {
      if (u.id === unitId) {
        return { ...u, hasActed: true, hasAmbushBuff: false };
      }
      return u;
    });

    set(state => ({
      grid: updatedGrid,
      units: updatedUnits,
      selectedUnitId: null,
      activeAction: null,
      resources: {
        ...state.resources,
        [currentPlayer]: currentGold + 4
      }
    }));

    const msg = `${UNIT_REGISTRY[unit.type].displayName} cleared the Ore Boulder at (${cellX}, ${cellY}) and mined +4g!`;
    get().addLog(msg);
    get().addFloatingText(cellX, cellY, '+4g', 'heal');
    if (unit.owner === 'ai') {
      get().addRecap(msg);
    }
  },

  buyUpgrade: (unitId, upgradeId) => {
    const { units, resources, currentPlayer } = get();
    const unit = units.find(u => u.id === unitId);
    if (!unit || unit.owner !== currentPlayer) return;

    const tree = UPGRADE_TREES[unit.type];
    const allNodes = [...tree.tier1, ...tree.tier2, ...tree.tier3];
    const upgrade = allNodes.find(node => node.id === upgradeId);
    if (!upgrade) return;

    const currentGold = resources[currentPlayer];
    if (currentGold < upgrade.cost) {
      get().addLog(`Not enough gold! (Needs ${upgrade.cost}g)`);
      return;
    }

    if (unit.unlockedUpgrades.includes(upgradeId)) return;

    const updatedUnits = units.map(u => {
      if (u.id === unitId) {
        const nextUpgrades = [...u.unlockedUpgrades, upgradeId];
        const prevMax = getMaxHp(u);
        const nextUnit = { ...u, unlockedUpgrades: nextUpgrades };
        const newMax = getMaxHp(nextUnit);
        const hpDiff = newMax - prevMax;

        return {
          ...nextUnit,
          hp: hpDiff > 0 ? u.hp + hpDiff : u.hp
        };
      }
      return u;
    });

    set(state => ({
      units: updatedUnits,
      resources: {
        ...state.resources,
        [currentPlayer]: currentGold - upgrade.cost
      }
    }));

    const msg = `Upgraded ${UNIT_REGISTRY[unit.type].displayName} with ${upgrade.name}.`;
    get().addLog(msg);
    get().addFloatingText(unit.x, unit.y, 'UPGRADED!', 'status');
    if (unit.owner === 'ai') {
      get().addRecap(msg);
    }
  },

  // --- CARD SYSTEM ACTIONS ---
  selectCard: (cardId) => {
    set({ selectedCardId: cardId, activeAction: null, cardTargetSourceId: null });
  },

  setCardTargetSource: (unitId) => {
    set({ cardTargetSourceId: unitId });
  },

  drawCard: (owner) => {
    const { deck, discardPile } = get();
    let currentDeck = [...deck];
    let currentDiscard = [...discardPile];

    if (currentDeck.length === 0) {
      if (currentDiscard.length === 0) {
        return;
      }
      currentDeck = [...currentDiscard];
      currentDiscard = [];
      for (let i = currentDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [currentDeck[i], currentDeck[j]] = [currentDeck[j], currentDeck[i]];
      }
      get().addLog('Reshuffled discard pile into deck.');
    }

    const cardType = currentDeck.pop()!;
    const newCard: Card = {
      id: `card-${Date.now()}-${Math.random()}`,
      ...CARD_TEMPLATES[cardType]
    } as Card;

    const handKey = owner === 'player' ? 'playerHand' : 'aiHand';
    const hand = get()[handKey];

    // Max hand size: 6
    if (hand.length >= 6) {
      currentDiscard.push(cardType);
      set({ deck: currentDeck, discardPile: currentDiscard });
      return;
    }

    set({
      deck: currentDeck,
      discardPile: currentDiscard,
      [handKey]: [...hand, newCard]
    });
  },

  drawUpTo: (owner) => {
    const handKey = owner === 'player' ? 'playerHand' : 'aiHand';
    let hand = get()[handKey];
    let draws = 0;
    while (hand.length < 5) {
      get().drawCard(owner);
      hand = get()[handKey];
      draws++;
      if (get().deck.length === 0 && get().discardPile.length === 0) break;
    }
    if (draws > 0) {
      get().addLog(`${owner === 'player' ? 'Player' : 'AI'} drew ${draws} cards.`);
    }
  },

  playCard: (cardId, targetUnitId) => {
    const { currentPlayer, playerHand, aiHand, units, resources, grid } = get();
    const isPlayer = currentPlayer === 'player';
    const hand = isPlayer ? playerHand : aiHand;
    const card = hand.find(c => c.id === cardId);
    const targetUnit = units.find(u => u.id === targetUnitId);

    if (!card || !targetUnit) return;

    // Gold cost check
    const goldPool = resources[currentPlayer];
    if (goldPool < card.goldCost) {
      get().addLog(`Not enough gold to play ${card.name}! (Needs ${card.goldCost}g)`);
      return;
    }

    let updatedUnits = [...units];
    let showLogMsg = '';
    
    switch (card.type) {
      case 'dodge':
        updatedUnits = units.map(u => {
          if (u.id === targetUnitId) {
            return { ...u, hasMissedBuff: true };
          }
          return u;
        });
        showLogMsg = `Played Dodge! on ${UNIT_REGISTRY[targetUnit.type].displayName}: shield activated!`;
        if (isPlayer) {
          get().addFloatingText(targetUnit.x, targetUnit.y, 'SHIELDED!', 'status');
        }
        break;

      case 'mead':
        const maxHp = getMaxHp(targetUnit);
        updatedUnits = units.map(u => {
          if (u.id === targetUnitId) {
            return { ...u, hp: Math.min(maxHp, u.hp + 3) };
          }
          return u;
        });
        showLogMsg = `Played Mead! on ${UNIT_REGISTRY[targetUnit.type].displayName}: Restored 3 HP.`;
        get().addFloatingText(targetUnit.x, targetUnit.y, '+3 HP', 'heal');
        break;

      case 'barrage':
        // Caster unit takes 2 recoil damage
        // Enemies within 2 tiles take 4 damage
        const enemies = units.filter(u => u.owner !== targetUnit.owner);
        const hitEnemies: string[] = [];
        
        updatedUnits = units.map(u => {
          // Recoil Damage to caster
          if (u.id === targetUnitId) {
            return damageUnitHelper(u, 2, get().addLog, get().addFloatingText);
          }
          // Damage to enemies
          if (u.owner !== targetUnit.owner) {
            const dist = getManhattanDistance(targetUnit.x, targetUnit.y, u.x, u.y);
            if (dist <= 2) {
              hitEnemies.push(UNIT_REGISTRY[u.type].displayName);
              get().addFloatingText(u.x, u.y, '-4', 'damage');
              
              if (u.hasMissedBuff) {
                return { ...u, hasMissedBuff: false };
              }
              return damageUnitHelper(u, 4, get().addLog, get().addFloatingText);
            }
          }
          return u;
        }).filter(u => u.hp > 0);

        showLogMsg = `Played Barrage! around ${UNIT_REGISTRY[targetUnit.type].displayName}: Caster took 2 recoil damage. Dealt 4 damage to ${
          hitEnemies.length > 0 ? hitEnemies.join(', ') : 'nobody'
        }.`;
        break;

      case 'steed':
        const hasSteedEquipped = targetUnit.equipment.some(e => e.type === 'steed');
        if (hasSteedEquipped) {
          get().addLog(`${UNIT_REGISTRY[targetUnit.type].displayName} already has a Steed!`);
          return;
        }

        updatedUnits = units.map(u => {
          if (u.id === targetUnitId) {
            return { ...u, equipment: [...u.equipment, card] };
          }
          return u;
        });
        showLogMsg = `Equipped Steed on ${UNIT_REGISTRY[targetUnit.type].displayName}: enemies need +1 attack range.`;
        get().addFloatingText(targetUnit.x, targetUnit.y, '+STEED', 'status');
        break;

      case 'enrage':
        updatedUnits = units.map(u => {
          if (u.id === targetUnitId) {
            return { ...u, hasEnrageBuff: true };
          }
          return u;
        });
        showLogMsg = `Played Enrage! on ${UNIT_REGISTRY[targetUnit.type].displayName}: +2 Attack Power for turn.`;
        get().addFloatingText(targetUnit.x, targetUnit.y, '+2 ATK', 'status');
        break;

      case 'fortify':
        updatedUnits = units.map(u => {
          if (u.id === targetUnitId) {
            return { ...u, hasFortifyBuff: true };
          }
          return u;
        });
        showLogMsg = `Played Fortify! on ${UNIT_REGISTRY[targetUnit.type].displayName}: +2 Defense for turn.`;
        get().addFloatingText(targetUnit.x, targetUnit.y, '+2 DEF', 'status');
        break;

      case 'saddle':
        updatedUnits = units.map(u => {
          if (u.id === targetUnitId) {
            return { ...u, hasSaddleBuff: true };
          }
          return u;
        });
        showLogMsg = `Played Saddle on ${UNIT_REGISTRY[targetUnit.type].displayName}: +1 Move Range for turn.`;
        get().addFloatingText(targetUnit.x, targetUnit.y, '+1 MOVE', 'status');
        break;

      case 'secondwind':
        updatedUnits = units.map(u => {
          if (u.id === targetUnitId) {
            return { ...u, hasSecondWindBuff: true };
          }
          return u;
        });
        showLogMsg = `Played Second Wind on ${UNIT_REGISTRY[targetUnit.type].displayName}: will revive on fatal blow.`;
        if (isPlayer) {
          get().addFloatingText(targetUnit.x, targetUnit.y, 'REVIVE BUFF', 'status');
        }
        break;

      case 'ambush':
        updatedUnits = units.map(u => {
          if (u.id === targetUnitId) {
            return { ...u, hasAmbushBuff: true };
          }
          return u;
        });
        showLogMsg = `Played Ambush on ${UNIT_REGISTRY[targetUnit.type].displayName}: invisible until it acts.`;
        if (isPlayer) {
          get().addFloatingText(targetUnit.x, targetUnit.y, 'STEALTHED', 'status');
        }
        break;

      case 'command':
        showLogMsg = `Played Command: drew 2 extra cards.`;
        // Draws cards immediately
        get().drawCard(currentPlayer);
        get().drawCard(currentPlayer);
        break;

      case 'siege':
        // Checks adjacent cells for Boulders to clear. If none, check for adjacent enemies to deal 2 damage.
        const dirs = [{dx:0,dy:1},{dx:0,dy:-1},{dx:1,dy:0},{dx:-1,dy:0}];
        let siegeActionTaken = false;
        
        // 1. Clear Boulder
        const updatedGrid = grid.map((row, y) =>
          row.map((cell, x) => {
            const isAdj = getManhattanDistance(targetUnit.x, targetUnit.y, x, y) === 1;
            if (cell.hasObstacle && isAdj && !siegeActionTaken) {
              siegeActionTaken = true;
              showLogMsg = `Played Siege: Cleared adjacent Boulder obstacle at (${x}, ${y}).`;
              return { ...cell, hasObstacle: false };
            }
            return cell;
          })
        );

        if (siegeActionTaken) {
          const currentGold = resources[currentPlayer];
          set(state => ({
            grid: updatedGrid,
            resources: {
              ...state.resources,
              [currentPlayer]: currentGold + 4
            }
          }));
        } else {
          // 2. Deal 2 damage to adjacent enemy
          updatedUnits = units.map(u => {
            const isAdj = getManhattanDistance(targetUnit.x, targetUnit.y, u.x, u.y) === 1;
            if (u.owner !== targetUnit.owner && isAdj && !siegeActionTaken) {
              siegeActionTaken = true;
              showLogMsg = `Played Siege: Dealt 2 damage to adjacent ${UNIT_REGISTRY[u.type].displayName}.`;
              get().addFloatingText(u.x, u.y, '-2', 'damage');
              
              if (u.hasMissedBuff) {
                return { ...u, hasMissedBuff: false };
              }
              return damageUnitHelper(u, 2, get().addLog, get().addFloatingText);
            }
            return u;
          }).filter(u => u.hp > 0);
        }

        if (!siegeActionTaken) {
          showLogMsg = `Played Siege on ${UNIT_REGISTRY[targetUnit.type].displayName} but no adjacent obstacle or enemy found.`;
        }
        break;
    }

    const newHand = hand.filter(c => c.id !== cardId);
    const handKey = isPlayer ? 'playerHand' : 'aiHand';

    set(state => ({
      units: updatedUnits,
      [handKey]: newHand,
      discardPile: [...state.discardPile, card.type],
      resources: {
        ...state.resources,
        [currentPlayer]: goldPool - card.goldCost
      },
      selectedCardId: null,
      cardTargetSourceId: null
    }));

    const isSecretCard = card.type === 'dodge' || card.type === 'secondwind' || card.type === 'ambush';
    if (isPlayer || !isSecretCard) {
      get().addLog(showLogMsg);
      if (!isPlayer) {
        get().addRecap(showLogMsg);
      }
    }

    const playerAlive = updatedUnits.some(u => u.owner === 'player');
    const aiAlive = updatedUnits.some(u => u.owner === 'ai');

    if (!playerAlive) {
      set({ winner: 'ai' });
      get().addLog('Defeat! The AI has eliminated all your units.');
    } else if (!aiAlive) {
      set({ winner: 'player' });
      get().addLog('Victory! You have eliminated all enemy units.');
    }
  },

  playStrikeCard: (cardId, attackerId, defenderId) => {
    const { currentPlayer, playerHand, aiHand, units, grid, resources, attacksThisTurn } = get();
    const isPlayer = currentPlayer === 'player';
    const hand = isPlayer ? playerHand : aiHand;
    const card = hand.find(c => c.id === cardId);
    const attacker = units.find(u => u.id === attackerId);
    const defender = units.find(u => u.id === defenderId);

    if (!card || !attacker || !defender) return;

    if (attacksThisTurn >= 1) {
      get().addLog(`${isPlayer ? 'Player' : 'AI'} can only attack once per turn!`);
      return;
    }

    // Gold cost check
    const goldPool = resources[currentPlayer];
    if (goldPool < card.goldCost) {
      get().addLog(`Not enough Gold to play Strike! (Needs ${card.goldCost}g)`);
      return;
    }

    const hasSteed = defender.equipment.some(e => e.type === 'steed');
    const actualDistance = getManhattanDistance(attacker.x, attacker.y, defender.x, defender.y);
    const effectiveDistance = hasSteed ? actualDistance + 1 : actualDistance;

    if (!isValidActionRange(attacker, defender.x, defender.y, 'attack')) return;

    const defenderTerrain = grid[defender.y][defender.x].type;

    let updatedUnits = [...units];

    const newHand = hand.filter(c => c.id !== cardId);
    const handKey = isPlayer ? 'playerHand' : 'aiHand';

    set(state => ({
      discardPile: [...state.discardPile, card.type],
      [handKey]: newHand,
      resources: {
        ...state.resources,
        [currentPlayer]: goldPool - card.goldCost
      },
      selectedCardId: null,
      cardTargetSourceId: null,
      attacksThisTurn: 1
    }));

    if (defender.hasMissedBuff) {
      updatedUnits = units.map(u => {
        if (u.id === defenderId) {
          return { ...u, hasMissedBuff: false };
        }
        if (u.id === attackerId) {
          return { ...u, hasAmbushBuff: false }; // Ambush broken by attack!
        }
        return u;
      });

      set({ units: updatedUnits, selectedUnitId: null, activeAction: null });
      get().addLog(`Played Strike! — Attack Dodged by ${UNIT_REGISTRY[defender.type].displayName}.`);
      get().addFloatingText(defender.x, defender.y, 'DODGED!', 'status');
      if (attacker.owner === 'ai') {
        get().addRecap(`AI played Strike! on ${UNIT_REGISTRY[defender.type].displayName} but it was DODGED.`);
      }
      return;
    }

    const result = resolveCombat({
      attacker,
      defender,
      distance: effectiveDistance,
      defenderTerrain
    });

    updatedUnits = units.map(u => {
      if (u.id === defenderId) {
        let afterDamage = damageUnitHelper(u, result.damageDealt, get().addLog, get().addFloatingText);
        return {
          ...afterDamage,
          shieldActive: result.shieldBlocked ? false : u.shieldActive
        };
      }
      if (u.id === attackerId) {
        let afterDamage = damageUnitHelper(u, result.retaliateDamage, get().addLog, get().addFloatingText);
        return {
          ...afterDamage,
          hasAmbushBuff: false // Ambush broken by attack!
        };
      }
      return u;
    });

    updatedUnits = updatedUnits.filter(u => u.hp > 0);

    set({
      units: updatedUnits,
      selectedUnitId: null,
      activeAction: null
    });

    const strikeMsg = `Played Strike! — ${result.logMessage}`;
    get().addLog(strikeMsg);
    get().addFloatingText(defender.x, defender.y, `-${result.damageDealt}`, 'damage');

    if (attacker.owner === 'ai') {
      get().addRecap(strikeMsg);
    }

    if (result.retaliateDamage > 0) {
      get().addLog(`${UNIT_REGISTRY[attacker.type].displayName} took ${result.retaliateDamage} retaliatory damage!`);
      get().addFloatingText(attacker.x, attacker.y, `-${result.retaliateDamage}`, 'damage');
    }

    const playerAlive = updatedUnits.some(u => u.owner === 'player');
    const aiAlive = updatedUnits.some(u => u.owner === 'ai');

    if (!playerAlive) {
      set({ winner: 'ai' });
      get().addLog('Defeat! The AI has eliminated all your units.');
    } else if (!aiAlive) {
      set({ winner: 'player' });
      get().addLog('Victory! You have eliminated all enemy units.');
    }
  },

  endTurn: () => {
    const { currentPlayer, units, grid, resources, turnNumber } = get();
    const activePlayer = currentPlayer;
    const nextPlayer = activePlayer === 'player' ? 'ai' : 'player';

    // 1. Automatic resource gathering
    let goldGathered = 0;
    const updatedUnits = units.map(u => {
      let unitObj = u;
      if (u.owner === nextPlayer) {
        unitObj = {
          ...u,
          hasActed: false,
          shieldActive: hasSpecialEffect(u, 'guardianShield') ? true : u.shieldActive
        };
      }

      if (u.owner === activePlayer && u.type === 'gatherer') {
        const cell = grid[u.y][u.x];
        if (cell.type === 'resource') {
          const isDeepMining = hasSpecialEffect(u, 'deepMining');
          goldGathered += isDeepMining ? 5 : 3;
        }
      }

      return unitObj;
    });

    // 2. Clear temporary buffs (Enrage, Fortify, Saddle) at end of active player's turn
    const cleanedUnits = updatedUnits.map(u => {
      if (u.owner === activePlayer) {
        return {
          ...u,
          hasEnrageBuff: false,
          hasFortifyBuff: false,
          hasSaddleBuff: false
        };
      }
      return u;
    });

    const activePlayerGold = resources[activePlayer];
    
    set(state => ({
      units: cleanedUnits,
      currentPlayer: nextPlayer,
      resources: {
        ...state.resources,
        [activePlayer]: activePlayerGold + goldGathered
      },
      selectedUnitId: null,
      activeAction: null,
      selectedCardId: null,
      cardTargetSourceId: null,
      turnNumber: nextPlayer === 'player' ? turnNumber + 1 : turnNumber,
      turnRecap: nextPlayer === 'player' ? [] : state.turnRecap,
      showTurnBanner: nextPlayer,
      attacksThisTurn: 0
    }));

    if (goldGathered > 0) {
      get().addLog(`${activePlayer === 'player' ? 'Player' : 'AI'} gathered +${goldGathered}g.`);
      if (activePlayer === 'ai') {
        get().addRecap(`AI Scout gathered +${goldGathered}g from Gold Mine.`);
      }
    }

    get().addLog(`${nextPlayer === 'player' ? 'Player' : 'AI'}'s turn.`);

    // Automatically draw up to 5 cards for the starting player
    get().drawUpTo(nextPlayer);

    setTimeout(() => {
      if (get().showTurnBanner === nextPlayer) {
        set({ showTurnBanner: null });
      }
    }, 1500);
  }
}));
export default useGameStore;
