export interface UpgradeNode {
  id: string;
  name: string;
  description: string;
  cost: number;
  statBonus: {
    maxHp?: number;
    attackPower?: number;
    moveRange?: number;
    healPower?: number;
  };
  specialEffect?: 'doubleAction' | 'retaliate' | 'camouflage' | 'deepMining' | 'guardianShield';
}

export interface UpgradeTree {
  tier1: UpgradeNode[];
  tier2: UpgradeNode[];
  tier3: UpgradeNode[];
}

export const UPGRADE_TREES: Record<string, UpgradeTree> = {
  swordsman: {
    tier1: [
      { id: 'off_hp_1', name: 'Hardened Armor', description: '+3 Max HP', cost: 5, statBonus: { maxHp: 3 } },
      { id: 'off_mov_1', name: 'Reinforced Boots', description: '+1 Move Range', cost: 5, statBonus: { moveRange: 1 } }
    ],
    tier2: [
      { id: 'off_atk_2', name: 'Heavy Strike', description: '+2 Attack Power', cost: 10, statBonus: { attackPower: 2 } },
      { id: 'off_ret_2', name: 'Thorn Mail', description: 'Deals 2 retaliatory damage in melee', cost: 10, statBonus: {}, specialEffect: 'retaliate' }
    ],
    tier3: [
      { id: 'off_act_3', name: 'Double Action', description: 'Move and act in one turn', cost: 15, statBonus: {}, specialEffect: 'doubleAction' }
    ]
  },
  archerMedic: {
    tier1: [
      { id: 'sup_hp_1', name: 'Alchemist Cloak', description: '+3 Max HP', cost: 5, statBonus: { maxHp: 3 } },
      { id: 'sup_mov_1', name: 'Light Sandals', description: '+1 Move Range', cost: 5, statBonus: { moveRange: 1 } }
    ],
    tier2: [
      { id: 'sup_rng_2', name: 'Longbow', description: '+1 Ranged Attack & Heal Range', cost: 10, statBonus: {}, specialEffect: 'camouflage' },
      { id: 'sup_hel_2', name: 'Holy Catalyst', description: '+3 Heal Power', cost: 10, statBonus: { healPower: 3 } }
    ],
    tier3: [
      { id: 'sup_act_3', name: 'Double Action', description: 'Move and act in one turn', cost: 15, statBonus: {}, specialEffect: 'doubleAction' }
    ]
  },
  scoutMiner: {
    tier1: [
      { id: 'gat_hp_1', name: 'Hard Hat', description: '+3 Max HP', cost: 5, statBonus: { maxHp: 3 } },
      { id: 'gat_mov_1', name: 'Hiking Boots', description: '+1 Move Range', cost: 5, statBonus: { moveRange: 1 } }
    ],
    tier2: [
      { id: 'gat_dgp_2', name: 'Deep Excavation', description: '+2 Gold gathered per yield', cost: 10, statBonus: {}, specialEffect: 'deepMining' },
      { id: 'gat_cam_2', name: 'Camouflage', description: 'Cannot be attacked from distance', cost: 10, statBonus: {}, specialEffect: 'camouflage' }
    ],
    tier3: [
      { id: 'gat_shd_3', name: 'Guardian Shield', description: 'Blocks first attack in a turn', cost: 15, statBonus: {}, specialEffect: 'guardianShield' }
    ]
  },
  get offense() { return this.swordsman; },
  get support() { return this.archerMedic; },
  get gatherer() { return this.scoutMiner; }
};
