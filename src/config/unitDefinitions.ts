export type UnitType = 'offense' | 'support' | 'gatherer';
export type Trait = 'melee' | 'ranged' | 'healer' | 'evasive';

export interface BaseUnitConfig {
  type: UnitType;
  displayName: string;
  maxHp: number;
  attackPower: number;
  moveRange: number;
  traits: Trait[];
  description: string;
}

export const UNIT_REGISTRY: Record<UnitType, BaseUnitConfig> = {
  offense: {
    type: 'offense',
    displayName: 'Swordsman',
    maxHp: 10,
    attackPower: 4,
    moveRange: 2,
    traits: ['melee'],
    description: 'Heavy frontline melee unit. Deals high damage in adjacent combat.'
  },
  support: {
    type: 'support',
    displayName: 'Archer Medic',
    maxHp: 7,
    attackPower: 3,
    moveRange: 2,
    traits: ['ranged', 'healer'],
    description: 'Ranged unit. Can heal adjacent/ranged allies, but cannot attack adjacent enemies.'
  },
  gatherer: {
    type: 'gatherer',
    displayName: 'Scout Miner',
    maxHp: 6,
    attackPower: 2,
    moveRange: 3,
    traits: ['melee', 'evasive'],
    description: 'Fast, agile unit. Gathers gold from resource tiles and gains defensive shelter on mountains.'
  }
};
