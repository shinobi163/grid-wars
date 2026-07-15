export type TileType = 'grass' | 'mountain' | 'resource' | 'base';

export interface TerrainConfig {
  type: TileType;
  displayName: string;
  moveCost: number;
  defenseBonus: number;
  description: string;
}

export const TERRAIN_REGISTRY: Record<TileType, TerrainConfig> = {
  grass: {
    type: 'grass',
    displayName: 'Plains',
    moveCost: 1,
    defenseBonus: 0,
    description: 'Flat, open plains. Standard movement and combat.'
  },
  mountain: {
    type: 'mountain',
    displayName: 'Mountains',
    moveCost: 2,
    defenseBonus: 1, // Standard defense bonus
    description: 'Rough terrain. Requires 2 movement points. Provides defensive protection.'
  },
  resource: {
    type: 'resource',
    displayName: 'Gold Ore',
    moveCost: 1,
    defenseBonus: 0,
    description: 'A rich gold mine. Gatherers collect gold here at the end of each turn.'
  },
  base: {
    type: 'base',
    displayName: 'Base HQ',
    moveCost: 1,
    defenseBonus: 2,
    description: 'The command center. High defense bonus. If all units are eliminated, game over.'
  }
};
