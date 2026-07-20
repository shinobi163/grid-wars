import { Unit, getMoveRange } from './combatResolver';
import { TileType, TERRAIN_REGISTRY } from '../config/terrainRules';
import { CLASSES } from '../config/unitDefinitions';

export interface Cell {
  x: number;
  y: number;
  type: TileType;
  hasObstacle: boolean;
}

export function getManhattanDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

// Check if a cell is inside the board boundaries (8x8)
export function isWithinBounds(x: number, y: number, boardSize = 8): boolean {
  return x >= 0 && x < boardSize && y >= 0 && y < boardSize;
}

// Check if a target cell is occupied by a unit
export function getUnitAt(x: number, y: number, units: Unit[]): Unit | undefined {
  return units.find(u => u.x === x && u.y === y && u.hp > 0);
}

// BFS Pathfinding to find all reachable cells for a unit
export function getReachableCells(
  unit: Unit,
  units: Unit[],
  grid: Cell[][],
  boardSize = 8
): { x: number; y: number; cost: number }[] {
  const maxRange = getMoveRange(unit);
  const reachable: { x: number; y: number; cost: number }[] = [];
  const queue: { x: number; y: number; cost: number }[] = [];
  
  // Maps coordinates to the minimum cost to reach them
  const visited = new Map<string, number>();

  queue.push({ x: unit.x, y: unit.y, cost: 0 });
  visited.set(`${unit.x},${unit.y}`, 0);

  const directions = [
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 }
  ];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    
    // Add to reachable list (exclude starting position)
    if (curr.x !== unit.x || curr.y !== unit.y) {
      reachable.push(curr);
    }

    for (const dir of directions) {
      const nextX = curr.x + dir.dx;
      const nextY = curr.y + dir.dy;

      if (!isWithinBounds(nextX, nextY, boardSize)) continue;

      const cell = grid[nextY][nextX];
      
      // Obstacles block movement
      if (cell.hasObstacle) continue;

      // Enemy units block movement; friendly units can be passed through but cannot stop on them
      const unitAtNext = getUnitAt(nextX, nextY, units);
      if (unitAtNext && unitAtNext.owner !== unit.owner && !unitAtNext.hasAmbushBuff) {
        continue; // Blocked by visible enemy
      }

      // Terrain movement cost
      const terrainCost = TERRAIN_REGISTRY[cell.type].moveCost;
      const totalCost = curr.cost + terrainCost;

      if (totalCost <= maxRange) {
        const key = `${nextX},${nextY}`;
        const previousCost = visited.get(key);

        if (previousCost === undefined || totalCost < previousCost) {
          visited.set(key, totalCost);
          queue.push({ x: nextX, y: nextY, cost: totalCost });
        }
      }
    }
  }

  // Filter out cells that contain any unit (cannot stack units on the same cell)
  return reachable.filter(c => {
    const u = getUnitAt(c.x, c.y, units);
    return !u || (u.owner !== unit.owner && u.hasAmbushBuff);
  });
}

export function isValidActionRange(
  attacker: Unit,
  targetX: number,
  targetY: number,
  actionType: 'attack' | 'heal'
): boolean {
  const dist = getManhattanDistance(attacker.x, attacker.y, targetX, targetY);
  const classDef = CLASSES[attacker.type];

  if (actionType === 'heal') {
    if (classDef.canHeal) {
      const hasLongbow = attacker.unlockedUpgrades.includes('sup_rng_2');
      const maxRange = classDef.healRange + (hasLongbow ? 1 : 0);
      return dist >= 1 && dist <= maxRange;
    }
    return false;
  }

  // Combat range validation
  if (!classDef.canAttackAdjacent && dist === 1) {
    return false; // Dead Zone
  }

  const hasLongbow = attacker.unlockedUpgrades.includes('sup_rng_2');
  const maxRange = classDef.attackRange + (hasLongbow ? 1 : 0);
  return dist >= (classDef.canAttackAdjacent ? 1 : 2) && dist <= maxRange;
}
