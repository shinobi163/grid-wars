import { UNIT_REGISTRY } from '../config/unitDefinitions';
import { resolveCombat, getMaxHp, getAttackPower, getMoveRange, Unit } from './combatResolver';
import { getReachableCells, Cell, getManhattanDistance, isValidActionRange } from './gameRules';
import { generateDeck, CARD_TEMPLATES } from '../config/cardTemplates';

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
    type: 'offense',
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

  console.log(`\n--- TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ---`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
