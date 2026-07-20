import { CLASSES, UnitType } from '../config/unitDefinitions';
import { UpgradeNode } from '../config/upgradeTrees';
import { TileType, TERRAIN_REGISTRY } from '../config/terrainRules';
import { Card, StatusEffect } from '../config/cardTemplates';

export interface Unit {
  id: string;
  type: UnitType;
  owner: 'player' | 'ai';
  x: number;
  y: number;
  hp: number;
  hasActed: boolean;
  unlockedUpgrades: string[];
  shieldActive: boolean;
  hasMissedBuff: boolean;
  equipment: Card[];
  statusEffects: StatusEffect[];
  
  // Temporary & Special Buffs
  hasEnrageBuff: boolean;      // +2 Attack
  hasFortifyBuff: boolean;     // +2 Defense
  hasSaddleBuff: boolean;      // +1 Move
  hasSecondWindBuff: boolean;  // Revive with 3 HP on fatal blow
  hasAmbushBuff: boolean;      // Invisible (untargetable)
}

// Helper to get all unlocked upgrade configurations for a unit
export function getUnlockedUpgradeNodes(unit: Unit): UpgradeNode[] {
  const classDef = CLASSES[unit.type];
  const tree = classDef.upgradeTree;
  const allNodes = [...tree.tier1, ...tree.tier2, ...tree.tier3];
  return allNodes.filter(node => unit.unlockedUpgrades.includes(node.id));
}

// Compute dynamic max HP
export function getMaxHp(unit: Unit): number {
  const classDef = CLASSES[unit.type];
  const base = classDef.hp;
  const bonus = getUnlockedUpgradeNodes(unit).reduce((acc, node) => acc + (node.statBonus.maxHp || 0), 0);
  return base + bonus;
}

// Compute dynamic attack power (includes Enrage buff)
export function getAttackPower(unit: Unit): number {
  const classDef = CLASSES[unit.type];
  const base = classDef.attack;
  const bonus = getUnlockedUpgradeNodes(unit).reduce((acc, node) => acc + (node.statBonus.attackPower || 0), 0);
  const buff = unit.hasEnrageBuff ? 2 : 0;
  return base + bonus + buff;
}

// Compute dynamic move range (includes Saddle buff)
export function getMoveRange(unit: Unit): number {
  const classDef = CLASSES[unit.type];
  const base = classDef.moveRange;
  const bonus = getUnlockedUpgradeNodes(unit).reduce((acc, node) => acc + (node.statBonus.moveRange || 0), 0);
  const buff = unit.hasSaddleBuff ? 1 : 0;
  return base + bonus + buff;
}

// Compute dynamic healing power
export function getHealPower(unit: Unit): number {
  const classDef = CLASSES[unit.type];
  if (!classDef.canHeal) return 0;
  const base = classDef.healRange; // Archer Medic base heal is 3
  const bonus = getUnlockedUpgradeNodes(unit).reduce((acc, node) => acc + (node.statBonus.healPower || 0), 0);
  return base + bonus;
}

// Check if a unit has a special effect active
export function hasSpecialEffect(unit: Unit, effectName: string): boolean {
  return getUnlockedUpgradeNodes(unit).some(node => node.specialEffect === effectName);
}

export interface CombatContext {
  attacker: Unit;
  defender: Unit;
  distance: number;
  defenderTerrain: TileType;
}

export interface CombatResult {
  damageDealt: number;
  retaliateDamage: number;
  shieldBlocked: boolean;
  logMessage: string;
}

export function resolveCombat(ctx: CombatContext): CombatResult {
  const { attacker, defender, distance, defenderTerrain } = ctx;
  
  const attackerClass = CLASSES[attacker.type];
  const defenderClass = CLASSES[defender.type];

  let baseDamage = getAttackPower(attacker);
  let defenseBonus = TERRAIN_REGISTRY[defenderTerrain].defenseBonus;
  
  // 1. Ranged Dead-Zone check
  if (!attackerClass.canAttackAdjacent && distance === 1) {
    return {
      damageDealt: 0,
      retaliateDamage: 0,
      shieldBlocked: false,
      logMessage: `${attackerClass.name} is too close to attack!`
    };
  }

  // 2. Melee vs Ranged adjacent bonus
  if (attackerClass.canAttackAdjacent && !defenderClass.canAttackAdjacent && distance === 1) {
    baseDamage += 2;
  }

  // 3. Class-specific Mountain/Terrain defense bonuses
  const terrainBonus = (defenderClass.terrainBonuses as any)?.[defenderTerrain]?.defenseBonus || 0;
  defenseBonus += terrainBonus;

  // 4. Fortify buff (+2 defense)
  if (defender.hasFortifyBuff) {
    defenseBonus += 2;
  }

  // 5. Guardian Shield check
  const hasShield = hasSpecialEffect(defender, 'guardianShield') && defender.shieldActive;
  if (hasShield) {
    return {
      damageDealt: 0,
      retaliateDamage: 0,
      shieldBlocked: true,
      logMessage: `Attack blocked by ${defenderClass.name}'s Guardian Shield!`
    };
  }

  // 6. Bounded RNG Variance
  const variance = Math.floor(Math.random() * 3) - 1; // [-1, 0, 1]
  const finalDamage = Math.max(1, (baseDamage - defenseBonus) + variance);

  // 7. Retaliation check (Thorn Mail)
  let retaliateDamage = 0;
  if (hasSpecialEffect(defender, 'retaliate') && distance === 1) {
    retaliateDamage = 2;
  }

  return {
    damageDealt: finalDamage,
    retaliateDamage,
    shieldBlocked: false,
    logMessage: `${attackerClass.name} attacked ${defenderClass.name} for ${finalDamage} damage (variance: ${variance}).`
  };
}
