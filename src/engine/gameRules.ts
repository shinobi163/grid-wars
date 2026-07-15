import { Unit, getMoveRange } from './combatResolver';
import { TileType, TERRAIN_REGISTRY } from '../config/terrainRules';

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

// Validate if attack/heal range is valid
export function isValidActionRange(
  attacker: Unit,
  targetX: number,
  targetY: number,
  actionType: 'attack' | 'heal'
): boolean {
  const dist = getManhattanDistance(attacker.x, attacker.y, targetX, targetY);

  if (actionType === 'heal') {
    if (attacker.type === 'support') {
      // Support can heal at range
      const hasLongbow = attacker.unlockedUpgrades.includes('sup_rng_2');
      const maxRange = hasLongbow ? 4 : 3;
      // Healer can heal adjacent cells (range 1) and up to maxRange
      return dist >= 1 && dist <= maxRange;
    }
    // Other classes cannot heal
    return false;
  }

  // Combat range validation
  if (attacker.type === 'support') {
    const hasLongbow = attacker.unlockedUpgrades.includes('sup_rng_2');
    const maxRange = hasLongbow ? 4 : 3;
    // Ranged support cannot attack adjacent cells (Dead Zone at dist 1)
    return dist >= 2 && dist <= maxRange;
  }

  // Melee units (Offense, Gatherer) can only attack adjacent cells
  return dist === 1;
}
