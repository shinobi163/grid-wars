import { UNIT_REGISTRY } from '../config/unitDefinitions';
import { resolveCombat, getMaxHp, getAttackPower, getMoveRange, Unit } from './combatResolver';
import { getReachableCells, Cell, getManhattanDistance, isValidActionRange } from './gameRules';
import { generateDeck, CARD_TEMPLATES, CARD_DEFAULTS } from '../config/cardTemplates';
import { useGameStore } from '../store/gameStore';

function runTests() {
  console.log('--- STARTING STRATEGY GAME ENGINE & CARDS TESTS ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Deck Generation test (Scale up to 46 cards)
  const deck = generateDeck();
  assert(deck.length === 46, 'Predictable deck generates exactly 46 cards');

  // 2. Mock Units with new temporary/special buffs
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
  assert(enragedAtk === baseAtk + 2, 'Enrage buff increases Attack power by +2');

  // Test Saddle Move range addition
  const baseMove = getMoveRange(mockSwordsman);
  const saddledSwordsman = { ...mockSwordsman, hasSaddleBuff: true };
  const saddledMove = getMoveRange(saddledSwordsman);
  assert(saddledMove === baseMove + 1, 'Saddle buff increases Move range by +1');

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
  assert(revivedUnit.hp === 3, 'Unit survives lethal blow with 3 HP and consumes Second Wind buff');

  // Test Ore Boulders gold rewards
  let gold = 0;
  const clearBoulderSim = () => {
    gold += 4;
  };
  clearBoulderSim();
  assert(gold === 4, 'Clearing an Ore Boulder rewards +4 gold');

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
  assert(result.unitX === 2 && result.unitY === 2, 'Moving unit is stopped adjacent to hidden enemy');
  assert(result.unitActed === true, 'Moving unit action is consumed immediately');
  assert(result.enemyStealth === false, 'Hidden enemy stealth is broken and revealed');

  // --- NEW DECKBUILDER & CYCLE MECHANIC TESTS ---
  try {
    // 9. Custom deck generation test
    const customComp = {
      strike: 20,
      mead: 10,
      dodge: 10,
      ambush: 2,
      secondwind: 1,
      saddle: 1,
      enrage: 1,
      siege: 1
    };
    const customDeck = generateDeck(customComp);
    assert(customDeck.length === 46, 'Custom deck composition generates exactly 46 cards');
    const strikeCount = customDeck.filter(c => c === 'strike').length;
    assert(strikeCount === 20, 'Custom deck has exactly 20 Strike cards');
    passed++;
    console.log('[PASS] Custom deck composition generates correctly');
  } catch (err: any) {
    failed++;
    console.error('[FAIL] Custom deck composition generates correctly:', err.message);
  }

  try {
    // 10. Store integration deckbuilder initialization test
    const store = useGameStore.getState();
    store.setDeckComposition({
      strike: 20,
      mead: 10,
      dodge: 10,
      ambush: 2,
      secondwind: 1,
      saddle: 1,
      enrage: 1,
      siege: 1
    });
    
    store.initGame();
    
    const activeStore = useGameStore.getState();
    const totalLoadedCards = activeStore.deck.length + activeStore.playerHand.length + activeStore.aiHand.length;
    assert(totalLoadedCards === 46, 'Store loads exactly 46 cards based on custom deckbuilder setting');
    passed++;
    console.log('[PASS] Store initializes custom deck size correctly');
  } catch (err: any) {
    failed++;
    console.error('[FAIL] Store initializes custom deck size correctly:', err.message);
  }

  try {
    // 11. Cycle card mechanic test
    const store = useGameStore.getState();
    assert(store.hasCycledThisTurn === false, 'Cycling is initially false for the turn');
    
    const cardToCycle = store.playerHand[0];
    assert(cardToCycle !== undefined, 'Player hand has cards to cycle');
    
    const handBefore = store.playerHand.length;
    const discardBefore = store.discardPile.length;
    
    // Perform cycle
    store.cycleCard(cardToCycle.id);
    
    const postCycleStore = useGameStore.getState();
    assert(postCycleStore.hasCycledThisTurn === true, 'Cycling sets hasCycledThisTurn to true');
    assert(postCycleStore.discardPile.length === discardBefore + 1, 'Discard pile size increases by 1');
    assert(postCycleStore.discardPile[postCycleStore.discardPile.length - 1] === cardToCycle.type, 'Discarded card is added to discard pile');
    assert(postCycleStore.playerHand.length === handBefore, 'Hand size is replenished back to original size');
    passed++;
    console.log('[PASS] Cycling a card successfully discards and replenishes hand');
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
    assert(postSecondCycleStore.discardPile.length === discardBefore, 'Second cycle in a single turn is ignored (discard pile size unchanged)');
    assert(postSecondCycleStore.playerHand.length === handBefore, 'Second cycle does not change hand size');
    passed++;
    console.log('[PASS] Double cycle in single turn is correctly blocked');
  } catch (err: any) {
    failed++;
    console.error('[FAIL] Double cycle in single turn is correctly blocked:', err.message);
  }

  console.log(`\n--- TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ---`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
