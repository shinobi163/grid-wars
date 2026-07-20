import { UPGRADE_TREES, UpgradeTree } from './upgradeTrees';

export type UnitType = string;
export type Trait = 'melee' | 'ranged' | 'healer' | 'evasive';

export interface UnitClassDefinition {
  id: string;                  // "swordsman" | "archerMedic" | "scoutMiner"
  name: string;                // "Swordsman"
  description: string;         // description text
  role: "offense" | "support" | "gatherer";
  hp: number;
  attack: number;
  moveRange: number;
  canAttackAdjacent: boolean;      // false for Archer Medic
  canClearObstacles: boolean;      // true for Swordsman
  canHeal: boolean;                // true for Archer Medic
  healRange: number;               // 3 for Archer Medic, 0 otherwise
  attackRange: number;             // 1 for Swordsman/Scout, 3 for Archer Medic
  gatherAmount?: number;           // Scout Miner: 3 base
  terrainBonuses?: {
    mountain?: { defenseBonus: number };
  };
  upgradeTree: UpgradeTree;      // existing 3-tier tree
}

export const CLASSES: Record<string, UnitClassDefinition> = {
  swordsman: {
    id: "swordsman",
    name: "Swordsman",
    description: "Heavy melee fighter. Able to clear boulders.",
    role: "offense",
    hp: 10,
    attack: 4,
    moveRange: 2,
    canAttackAdjacent: true,
    canClearObstacles: true,
    canHeal: false,
    healRange: 0,
    attackRange: 1,
    upgradeTree: UPGRADE_TREES.swordsman
  },
  archerMedic: {
    id: "archerMedic",
    name: "Archer Medic",
    description: "Ranged support fighter. Can heal allies.",
    role: "support",
    hp: 7,
    attack: 3,
    moveRange: 2,
    canAttackAdjacent: false,
    canClearObstacles: false,
    canHeal: true,
    healRange: 3,
    attackRange: 3,
    upgradeTree: UPGRADE_TREES.archerMedic
  },
  scoutMiner: {
    id: "scoutMiner",
    name: "Scout Miner",
    description: "Swift gatherer. Moves quickly and excels in mountainous terrain.",
    role: "gatherer",
    hp: 6,
    attack: 2,
    moveRange: 3,
    canAttackAdjacent: true,
    canClearObstacles: false,
    canHeal: false,
    healRange: 0,
    attackRange: 1,
    gatherAmount: 3,
    terrainBonuses: {
      mountain: { defenseBonus: 2 } // scout gets extra 2 defense on mountain
    },
    upgradeTree: UPGRADE_TREES.scoutMiner
  }
};

// Getter wrapper to map 'offense' | 'support' | 'gatherer' for backwards compatibility
export const UNIT_REGISTRY: Record<string, any> = {
  get offense() { return { ...CLASSES.swordsman, displayName: CLASSES.swordsman.name }; },
  get support() { return { ...CLASSES.archerMedic, displayName: CLASSES.archerMedic.name }; },
  get gatherer() { return { ...CLASSES.scoutMiner, displayName: CLASSES.scoutMiner.name }; },
  get swordsman() { return { ...CLASSES.swordsman, displayName: CLASSES.swordsman.name }; },
  get archerMedic() { return { ...CLASSES.archerMedic, displayName: CLASSES.archerMedic.name }; },
  get scoutMiner() { return { ...CLASSES.scoutMiner, displayName: CLASSES.scoutMiner.name }; }
};
export default CLASSES;
