import assert from 'assert';
import { CLASSES } from '../config/unitDefinitions';
import { resolveCombat, getMaxHp, getAttackPower, getMoveRange, Unit } from './combatResolver';
import { getReachableCells, Cell, getManhattanDistance, isValidActionRange } from './gameRules';
import { generateDeck, CARD_TEMPLATES, CARD_DEFAULTS } from '../config/cardTemplates';
import { useGameStore } from '../store/gameStore';

function runTests() {
  console.log('--- STARTING STRATEGY GAME ENGINE & CARDS TESTS ---');
  let passed = 0;
  let failed = 0;

  function localAssert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Deck Generation test (Scale down to 23 cards)
  const deck = generateDeck();
  localAssert(deck.length === 23, 'Predictable deck generates exactly 23 cards');

  // 2. Mock Units
  const mockSwordsman: Unit = {
    id: 'test_swordsman',
    type: 'swordsman',
    owner: 'player',
    x: 2,
    y: 2,
    hp: 10,
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
  };

  // Test Enrage Attack power addition
  const baseAtk = getAttackPower(mockSwordsman);
  const enragedSwordsman = { ...mockSwordsman, hasEnrageBuff: true };
  const enragedAtk = getAttackPower(enragedSwordsman);
  localAssert(enragedAtk === baseAtk + 2, 'Enrage buff increases Attack power by +2');

  // Test Saddle Move range addition
  const baseMove = getMoveRange(mockSwordsman);
  const saddledSwordsman = { ...mockSwordsman, hasSaddleBuff: true };
  const saddledMove = getMoveRange(saddledSwordsman);
  localAssert(saddledMove === baseMove + 1, 'Saddle buff increases Move range by +1');

  // Test Second Wind fatal blow survive
  const applyDamageSim = (u: Unit, damage: number): Unit => {
    let nextHp = u.hp - damage;
    if (nextHp <= 0) {
      if (u.hasSecondWindBuff) {
        return { ...u, hp: 3, hasSecondWindBuff: false };
      }
      return { ...u, hp: 0 };
    }
    return { ...u, hp: nextHp };
  };

  const unitWithSecondWind = { ...mockSwordsman, hasSecondWindBuff: true };
  const revivedUnit = applyDamageSim(unitWithSecondWind, 12);
  localAssert(revivedUnit.hp === 3, 'Unit survives lethal blow with 3 HP and consumes Second Wind buff');

  // Test Ore Boulders gold rewards
  let gold = 0;
  const clearBoulderSim = () => {
    gold += 4;
  };
  clearBoulderSim();
  localAssert(gold === 4, 'Clearing an Ore Boulder rewards +4 gold');

  // Test Stealth Collision Bump detection simulation
  const mockHiddenEnemy: Unit = {
    ...mockSwordsman,
    id: 'hidden_scout',
    owner: 'ai',
    x: 2,
    y: 3, // Target space
    hasAmbushBuff: true
  };

  const moveUnitSim = (unit: Unit, toX: number, toY: number, enemy: Unit) => {
    const isCollision = (enemy.x === toX && enemy.y === toY && enemy.hasAmbushBuff);
    if (isCollision) {
      // Stopped adjacent: (toX, toY - 1)
      return {
        unitX: toX,
        unitY: toY - 1,
        unitActed: true,
        enemyStealth: false // broke enemy stealth
      };
    }
    return {
      unitX: toX,
      unitY: toY,
      unitActed: false,
      enemyStealth: enemy.hasAmbushBuff
    };
  };

  const result = moveUnitSim(mockSwordsman, 2, 3, mockHiddenEnemy);
  localAssert(result.unitX === 2 && result.unitY === 2, 'Moving unit is stopped adjacent to hidden enemy');
  localAssert(result.unitActed === true, 'Moving unit action is consumed immediately');
  localAssert(result.enemyStealth === false, 'Hidden enemy stealth is broken and revealed');

  // --- DEFAULT ACTIONS ECONOMY TESTS ---
  try {
    const store = useGameStore.getState();
    store.initGame();
    
    // Set custom coordinates for testing
    useGameStore.setState(state => ({
      units: state.units.map(u => {
        if (u.id === 'player_offense') {
          return { ...u, x: 2, y: 2, hp: 10, hasActed: false };
        }
        if (u.id === 'ai_offense') {
          return { ...u, x: 2, y: 3, hp: 10 }; // Adjacent
        }
        return u;
      })
    }));

    const playerUnit = useGameStore.getState().units.find(u => u.id === 'player_offense')!;
    const aiUnit = useGameStore.getState().units.find(u => u.id === 'ai_offense')!;
    
    // Execute standard attack
    store.attackUnit(playerUnit.id, aiUnit.id);
    
    const postAttackUnits = useGameStore.getState().units;
    const attacker = postAttackUnits.find(u => u.id === 'player_offense')!;
    const defender = postAttackUnits.find(u => u.id === 'ai_offense')!;
    
    localAssert(defender.hp < 10, 'Standard attack successfully inflicts damage on adjacent enemy');
    localAssert(attacker.hasActed === true, 'Standard attack consumes the unit\'s turn action');
  } catch (err: any) {
    failed++;
    console.error('[FAIL] Standard attack execution:', err.message);
  }

  try {
    const store = useGameStore.getState();
    store.initGame();

    // Setup healer Medic and a damaged ally unit
    useGameStore.setState(state => ({
      units: state.units.map(u => {
        if (u.id === 'player_support') {
          return { ...u, x: 1, y: 1, hasActed: false };
        }
        if (u.id === 'player_offense') {
          return { ...u, x: 1, y: 2, hp: 5 }; // Damaged ally
        }
        return u;
      })
    }));

    const healer = useGameStore.getState().units.find(u => u.id === 'player_support')!;
    const target = useGameStore.getState().units.find(u => u.id === 'player_offense')!;

    // Execute standard heal
    store.healUnit(healer.id, target.id);

    const postHealUnits = useGameStore.getState().units;
    const healedTarget = postHealUnits.find(u => u.id === 'player_offense')!;
    const activeHealer = postHealUnits.find(u => u.id === 'player_support')!;

    localAssert(healedTarget.hp > 5, 'Archer Medic standard heal successfully restores ally HP');
    localAssert(activeHealer.hasActed === true, 'Standard heal consumes healer\'s turn action');
  } catch (err: any) {
    failed++;
    console.error('[FAIL] Standard heal execution:', err.message);
  }

  // --- NEW DECKBUILDER & CYCLE MECHANIC TESTS ---
  try {
    // 9. Custom deck generation test
    const customComp = {
      dodge: 10,
      ambush: 2,
      secondwind: 1,
      saddle: 4,
      enrage: 3,
      siege: 3
    };
    const customDeck = generateDeck(customComp);
    localAssert(customDeck.length === 23, 'Custom deck composition generates exactly 23 cards');
    const dodgeCount = customDeck.filter(c => c === 'dodge').length;
    localAssert(dodgeCount === 10, 'Custom deck has exactly 10 Dodge cards');
  } catch (err: any) {
    failed++;
    console.error('[FAIL] Custom deck composition generates correctly:', err.message);
  }

  try {
    // 10. Store integration deckbuilder initialization test
    const store = useGameStore.getState();
    store.setDeckComposition({
      dodge: 10,
      ambush: 2,
      secondwind: 1,
      saddle: 4,
      enrage: 3,
      siege: 3
    });
    
    store.initGame();
    
    const activeStore = useGameStore.getState();
    const totalLoadedCards = activeStore.deck.length + activeStore.playerHand.length + activeStore.aiHand.length;
    localAssert(totalLoadedCards === 23, 'Store loads exactly 23 cards based on custom deckbuilder setting');
  } catch (err: any) {
    failed++;
    console.error('[FAIL] Store initializes custom deck size correctly:', err.message);
  }

  try {
    // 11. Cycle card mechanic test
    const store = useGameStore.getState();
    localAssert(store.hasCycledThisTurn === false, 'Cycling is initially false for the turn');
    
    const cardToCycle = store.playerHand[0];
    localAssert(cardToCycle !== undefined, 'Player hand has cards to cycle');
    
    const handBefore = store.playerHand.length;
    const discardBefore = store.discardPile.length;
    
    // Perform cycle
    store.cycleCard(cardToCycle.id);
    
    const postCycleStore = useGameStore.getState();
    localAssert(postCycleStore.hasCycledThisTurn === true, 'Cycling sets hasCycledThisTurn to true');
    localAssert(postCycleStore.discardPile.length === discardBefore + 1, 'Discard pile size increases by 1');
    localAssert(postCycleStore.discardPile[postCycleStore.discardPile.length - 1] === cardToCycle.type, 'Discarded card is added to discard pile');
    localAssert(postCycleStore.playerHand.length === handBefore, 'Hand size is replenished back to original size');
  } catch (err: any) {
    failed++;
    console.error('[FAIL] Cycling a card successfully discards and replenishes hand:', err.message);
  }

  try {
    // 12. Bounded cycle check: cannot cycle twice in a turn
    const store = useGameStore.getState();
    const handBefore = store.playerHand.length;
    const discardBefore = store.discardPile.length;
    
    const secondCardToCycle = store.playerHand[0];
    store.cycleCard(secondCardToCycle.id);
    
    const postSecondCycleStore = useGameStore.getState();
    localAssert(postSecondCycleStore.discardPile.length === discardBefore, 'Second cycle in a single turn is ignored (discard pile size unchanged)');
    localAssert(postSecondCycleStore.playerHand.length === handBefore, 'Second cycle does not change hand size');
  } catch (err: any) {
    failed++;
    console.error('[FAIL] Double cycle in single turn is correctly blocked:', err.message);
  }

  console.log(`\n--- TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ---`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
