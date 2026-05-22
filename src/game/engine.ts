// ============================================================
// FerroNest - Game Engine (Professional Edition)
// Core Simulation with A* Pathfinding, Influence Maps,
// Emergent AI, Supply Chains, and Deep Systems
// ============================================================

import {
  GameState, Cell, TerrainType, AntCaste, AntState, ChamberType,
  ResourceType, PheromoneType, GamePhase, GameTool, GameNotification,
  Brood, BroodStage, Ant, Enemy, EnemyType, EnemyBehavior, GameEvent,
  EventType, ColonyMind, MindAbility, MindAbilityType, ResourceDeposit,
  AntPersonality, AntMemory, InfluenceCell, EvolutionUpgrade, EvolutionBranch,
} from './types';
import {
  MAP_WIDTH, MAP_HEIGHT, SURFACE_ROW, TICKS_PER_DAY, ANT_STATS,
  CHAMBER_INFO, PHEROMONE_SETTINGS, BROOD_TIMING, ENEMY_STATS,
  EVENT_INFO, MIND_ABILITIES, PHEROMONE_NAMES, PERSONALITY_MODIFIERS,
  PHASE_THRESHOLDS, FOG_SETTINGS, SCORE_VALUES,
} from './constants';

let nextId = 0;
function genId(): string {
  return `e${nextId++}`;
}

// ============================================================
// MAP GENERATION - Procedural with natural features
// ============================================================

// Simple noise function for terrain variation
function noise2D(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number, scale: number): number {
  const sx = x / scale;
  const sy = y / scale;
  const ix = Math.floor(sx);
  const iy = Math.floor(sy);
  const fx = sx - ix;
  const fy = sy - iy;

  const a = noise2D(ix, iy);
  const b = noise2D(ix + 1, iy);
  const c = noise2D(ix, iy + 1);
  const d = noise2D(ix + 1, iy + 1);

  const ab = a + (b - a) * fx;
  const cd = c + (d - c) * fx;
  return ab + (cd - ab) * fy;
}

function createMap(): Cell[][] {
  const map: Cell[][] = [];

  for (let y = 0; y < MAP_HEIGHT; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      const cell: Cell = {
        x, y,
        terrain: TerrainType.Dirt,
        hardness: 0.5,
        humidity: 0,
        temperature: 0.5,
        contamination: 0,
        waterLevel: 0,
        excavatable: true,
        explored: false,
        lightLevel: 0,
        tunnelQuality: 0,
        soilNutrients: 0.5,
      };

      const depth = y - SURFACE_ROW;
      const n = smoothNoise(x, y, 8);
      const n2 = smoothNoise(x + 100, y + 100, 15);

      if (y < 3) {
        cell.terrain = TerrainType.Sky;
        cell.excavatable = false;
        cell.hardness = 1;
        cell.lightLevel = 1;
      } else if (y < SURFACE_ROW) {
        if (y === 3) {
          cell.terrain = TerrainType.SurfaceGrass;
          cell.excavatable = false;
          cell.hardness = 0.8;
          cell.lightLevel = 1;
        } else {
          cell.terrain = TerrainType.SurfaceDirt;
          cell.hardness = 0.25 + n * 0.1;
          cell.lightLevel = 0.9;
        }
      } else {
        // Underground with natural variation
        if (depth > 45) {
          cell.terrain = TerrainType.Stone;
          cell.hardness = 0.95;
          cell.excavatable = false;
        } else if (depth > 35) {
          cell.terrain = TerrainType.HardDirt;
          cell.hardness = 0.75 + n * 0.1;
        } else if (depth > 18) {
          cell.terrain = TerrainType.Dirt;
          cell.hardness = 0.55 + n * 0.1;
        } else {
          cell.terrain = TerrainType.Dirt;
          cell.hardness = 0.35 + n * 0.1;
        }

        // Clay deposits
        if (depth > 10 && depth < 30 && n2 > 0.75) {
          cell.terrain = TerrainType.Clay;
          cell.hardness = 0.7;
        }

        // Sand pockets
        if (depth > 5 && depth < 25 && n2 < 0.15) {
          cell.terrain = TerrainType.Sand;
          cell.hardness = 0.2;
        }

        // Roots near surface
        if (depth < 20 && n > 0.85) {
          cell.terrain = TerrainType.Roots;
          cell.hardness = 0.65;
        }

        // Stone veins
        if (depth > 25 && n > 0.9) {
          cell.terrain = TerrainType.Stone;
          cell.hardness = 0.95;
          cell.excavatable = false;
        }

        // Underground water
        if (depth > 30 && n2 < 0.08) {
          cell.terrain = TerrainType.Water;
          cell.excavatable = false;
          cell.hardness = 1;
          cell.waterLevel = 1;
        }

        // Humidity increases with depth
        cell.humidity = Math.min(1, 0.15 + depth * 0.012 + (cell.terrain === TerrainType.Water ? 0.3 : 0));
        // Temperature stabilizes with depth
        cell.temperature = Math.max(0.3, 0.7 - depth * 0.006);
        // Nutrients from organic matter near surface
        cell.soilNutrients = Math.max(0, 0.8 - depth * 0.012 + n * 0.2);
        // Light decreases with depth
        cell.lightLevel = Math.max(0, 0.5 - depth * 0.02);
      }

      row.push(cell);
    }
    map.push(row);
  }
  return map;
}

// ============================================================
// INITIAL QUEEN CHAMBER
// ============================================================

function createInitialChamber(map: Cell[][]): { cx: number; cy: number } {
  const cx = Math.floor(MAP_WIDTH / 2);
  const cy = SURFACE_ROW + 5;
  const radius = 3;

  // Main entrance tunnel
  for (let y = SURFACE_ROW; y <= cy + radius; y++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = cx + dx;
      if (nx >= 0 && nx < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
        map[y][nx].terrain = TerrainType.Tunnel;
        map[y][nx].hardness = 0;
        map[y][nx].excavatable = false;
        map[y][nx].tunnelQuality = 0.8;
        map[y][nx].explored = true;
        map[y][nx].lightLevel = y < SURFACE_ROW + 2 ? 0.7 : 0.3;
      }
    }
  }

  // Side chambers
  const sideOffset = radius + 2;
  for (const dir of [-1, 1]) {
    const tunnelY = cy;
    for (let dx = dir; Math.abs(dx) <= sideOffset; dx += dir) {
      const nx = cx + dx;
      if (nx >= 0 && nx < MAP_WIDTH) {
        map[tunnelY][nx].terrain = TerrainType.Tunnel;
        map[tunnelY][nx].hardness = 0;
        map[tunnelY][nx].excavatable = false;
        map[tunnelY][nx].tunnelQuality = 0.7;
        map[tunnelY][nx].explored = true;
      }
    }
  }

  // Queen chamber
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= radius * radius + 1) {
        const ny = cy + dy;
        const nx = cx + dx;
        if (ny >= 0 && ny < MAP_HEIGHT && nx >= 0 && nx < MAP_WIDTH) {
          map[ny][nx].terrain = TerrainType.Chamber;
          map[ny][nx].chamberType = ChamberType.QueenChamber;
          map[ny][nx].hardness = 0;
          map[ny][nx].excavatable = false;
          map[ny][nx].humidity = 0.65;
          map[ny][nx].temperature = 0.6;
          map[ny][nx].explored = true;
          map[ny][nx].lightLevel = 0.5;
          map[ny][nx].tunnelQuality = 1;
        }
      }
    }
  }

  return { cx, cy };
}

// ============================================================
// ANT CREATION
// ============================================================

const PERSONALITIES = Object.values(AntPersonality);

function createAnt(caste: AntCaste, x: number, y: number): Ant {
  const stats = ANT_STATS[caste];
  const personality = caste === AntCaste.Queen
    ? AntPersonality.Social
    : PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)];

  return {
    id: genId(),
    caste,
    state: AntState.Idle,
    prevState: AntState.Idle,
    x, y,
    targetX: x,
    targetY: y,
    health: stats.maxHealth,
    maxHealth: stats.maxHealth,
    hunger: 0,
    age: 0,
    maxAge: stats.maxAge,
    speed: stats.speed,
    attack: stats.attack,
    carryCapacity: stats.carryCapacity,
    carrying: null,
    carryAmount: 0,
    path: [],
    pathIndex: 0,
    stateTimer: 0,
    personality,
    memory: {
      lastFoodSource: null,
      lastDangerLocation: null,
      homePosition: { x, y },
      visitedChambers: [],
      resourceLocations: [],
      dangerTimer: 0,
    },
    fatigue: 0,
    experience: 0,
    loyalty: 50 + Math.random() * 30,
    lastPheromoneTick: 0,
    facingAngle: -Math.PI / 2,
    animationFrame: Math.random() * Math.PI * 2,
  };
}

// ============================================================
// ENEMY CREATION
// ============================================================

function createEnemy(type: EnemyType, x: number, y: number): Enemy {
  const stats = ENEMY_STATS[type];
  let behavior = EnemyBehavior.Wander;
  if (type === EnemyType.Spider || type === EnemyType.Wasp) behavior = EnemyBehavior.Hunt;
  else if (type === EnemyType.RivalAnt) behavior = EnemyBehavior.Raid;
  else if (type === EnemyType.Antlion) behavior = EnemyBehavior.Ambush;
  else if (type === EnemyType.Beetle || type === EnemyType.Termite) behavior = EnemyBehavior.Territorial;

  return {
    id: genId(),
    type, x, y,
    targetX: x,
    targetY: y,
    health: stats.maxHealth,
    maxHealth: stats.maxHealth,
    attack: stats.attack,
    speed: stats.speed,
    path: [],
    pathIndex: 0,
    stateTimer: 0,
    behavior,
    aggroRange: stats.aggroRange,
    lootTable: stats.loot as { type: ResourceType; amount: number }[],
    animationFrame: Math.random() * Math.PI * 2,
    facingAngle: 0,
  };
}

// ============================================================
// COLONY MIND
// ============================================================

function createColonyMind(): ColonyMind {
  return {
    consciousness: 50,
    maxConsciousness: 100,
    chargeRate: 0.02,
    abilities: Object.entries(MIND_ABILITIES).map(([type, info]) => ({
      type: type as MindAbilityType,
      cost: info.cost,
      cooldown: info.cooldown,
      currentCooldown: 0,
      active: false,
      duration: info.duration,
      remainingDuration: 0,
    })),
  };
}

// ============================================================
// INFLUENCE MAP
// ============================================================

function createInfluenceMap(): InfluenceCell[][] {
  const map: InfluenceCell[][] = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    const row: InfluenceCell[] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      row.push({
        collectPressure: 0,
        defendPressure: 0,
        explorePressure: 0,
        dangerLevel: 0,
        foodAttraction: 0,
        homeAttraction: 0,
      });
    }
    map.push(row);
  }
  return map;
}

// ============================================================
// INITIALIZE GAME STATE
// ============================================================

export function createInitialState(): GameState {
  const map = createMap();
  const { cx, cy } = createInitialChamber(map);

  const queen = createAnt(AntCaste.Queen, cx, cy);
  const workers: Ant[] = [];
  for (let i = 0; i < 6; i++) {
    const wx = cx + (Math.random() > 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * 3));
    const wy = cy + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 2);
    workers.push(createAnt(AntCaste.Worker,
      Math.max(0, Math.min(MAP_WIDTH - 1, wx)),
      Math.max(SURFACE_ROW, Math.min(MAP_HEIGHT - 1, wy))
    ));
  }

  // Create a scout
  const scout = createAnt(AntCaste.Scout, cx + 2, cy);

  // Surface deposits with more variety
  const surfaceDeposits: ResourceDeposit[] = [];
  for (let i = 0; i < 12; i++) {
    const dx = 5 + Math.floor(Math.random() * (MAP_WIDTH - 10));
    const dy = 4 + Math.floor(Math.random() * 4);
    const types = [ResourceType.Food, ResourceType.Protein, ResourceType.Sugar, ResourceType.Water, ResourceType.LeafFragments, ResourceType.Nectar];
    const type = types[Math.floor(Math.random() * types.length)];
    surfaceDeposits.push({
      id: genId(),
      x: dx, y: dy,
      type,
      amount: 25 + Math.floor(Math.random() * 35),
      maxAmount: 60,
      surface: true,
      respawnRate: 0.5 + Math.random() * 1.5,
      depleted: false,
    });
  }

  return {
    running: true,
    paused: false,
    tick: 0,
    day: 1,
    dayProgress: 0,
    speed: 1,
    timeOfDay: 0.25,
    map,
    ants: [queen, ...workers, scout],
    enemies: [],
    resources: {
      food: 40,
      protein: 15,
      sugar: 20,
      fungus: 0,
      water: 25,
      pheromones: 60,
      biomass: 5,
      compactEarth: 8,
      nectar: 5,
      leafFragments: 3,
    },
    surfaceDeposits,
    pheromoneMap: new Map(),
    influenceMap: createInfluenceMap(),
    events: [],
    colonyMind: createColonyMind(),
    evolutions: Object.values(EvolutionBranch).map(branch => ({
      branch,
      level: 0,
      unlocked: false,
      description: `Evolve ${branch} traits`,
      effect: `+${branch} bonuses`,
    })),
    totalAntsHatched: 8,
    totalAntsLost: 0,
    queenAlive: true,
    gamePhase: GamePhase.Survival,
    colonyScore: 0,
    selectedTool: GameTool.Excavate,
    selectedChamberType: ChamberType.BroodChamber,
    selectedPheromoneType: PheromoneType.Collect,
    showPheromoneView: false,
    showInfluenceView: false,
    showMinimap: true,
    cameraX: cx * 12 - 500,
    cameraY: (cy - 8) * 12 - 200,
    zoom: 1,
    hoveredCell: null,
    selectedAnt: null,
    notifications: [],
    brood: [],
    ambientLight: 0.6,
  };
}

// ============================================================
// A* PATHFINDING
// ============================================================

function isWalkable(map: Cell[][], x: number, y: number): boolean {
  if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return false;
  const t = map[y][x].terrain;
  return t === TerrainType.Tunnel || t === TerrainType.Chamber ||
    t === TerrainType.SurfaceDirt || t === TerrainType.SurfaceGrass ||
    t === TerrainType.Sand;
}

function heuristic(ax: number, ay: number, bx: number, by: number): number {
  // Octile distance for 8-directional movement
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
}

function findPathAStar(map: Cell[][], sx: number, sy: number, tx: number, ty: number, maxIterations = 3000): { x: number; y: number }[] {
  if (sx === tx && sy === ty) return [];
  if (!isWalkable(map, tx, ty)) return [];

  const startKey = `${sx},${sy}`;
  const goalKey = `${tx},${ty}`;

  // Open set as a simple priority queue
  const openSet: { key: string; f: number }[] = [{ key: startKey, f: 0 }];
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();
  const closedSet = new Set<string>();

  gScore.set(startKey, 0);
  fScore.set(startKey, heuristic(sx, sy, tx, ty));

  const dirs = [
    { dx: 0, dy: -1, cost: 1 }, { dx: 0, dy: 1, cost: 1 },
    { dx: -1, dy: 0, cost: 1 }, { dx: 1, dy: 0, cost: 1 },
    { dx: -1, dy: -1, cost: Math.SQRT2 }, { dx: 1, dy: -1, cost: Math.SQRT2 },
    { dx: -1, dy: 1, cost: Math.SQRT2 }, { dx: 1, dy: 1, cost: Math.SQRT2 },
  ];

  let iterations = 0;

  while (openSet.length > 0 && iterations < maxIterations) {
    iterations++;

    // Find node with lowest fScore
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;
    const currentKey = current.key;

    if (currentKey === goalKey) {
      // Reconstruct path
      const path: { x: number; y: number }[] = [];
      let ck: string | undefined = currentKey;
      while (ck && ck !== startKey) {
        const [px, py] = ck.split(',').map(Number);
        path.unshift({ x: px, y: py });
        ck = cameFrom.get(ck);
      }
      return path;
    }

    closedSet.add(currentKey);

    const [cx, cy] = currentKey.split(',').map(Number);

    for (const dir of dirs) {
      const nx = cx + dir.dx;
      const ny = cy + dir.dy;
      const nKey = `${nx},${ny}`;

      if (closedSet.has(nKey)) continue;
      if (!isWalkable(map, nx, ny)) continue;

      // Diagonal movement requires both adjacent cells to be walkable
      if (dir.dx !== 0 && dir.dy !== 0) {
        if (!isWalkable(map, cx + dir.dx, cy) || !isWalkable(map, cx, cy + dir.dy)) continue;
      }

      // Tunnel quality affects speed
      const cell = map[ny][nx];
      const qualityMul = 1 + (1 - cell.tunnelQuality) * 0.5;
      const tentativeG = (gScore.get(currentKey) || 0) + dir.cost * qualityMul;

      if (tentativeG < (gScore.get(nKey) || Infinity)) {
        cameFrom.set(nKey, currentKey);
        gScore.set(nKey, tentativeG);
        const f = tentativeG + heuristic(nx, ny, tx, ty);
        fScore.set(nKey, f);

        if (!openSet.find(n => n.key === nKey)) {
          openSet.push({ key: nKey, f });
        }
      }
    }
  }

  return []; // No path found
}

function findNearestWalkable(map: Cell[][], x: number, y: number): { x: number; y: number } | null {
  if (isWalkable(map, x, y)) return { x, y };

  for (let r = 1; r < 15; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (isWalkable(map, x + dx, y + dy)) return { x: x + dx, y: y + dy };
      }
    }
  }
  return null;
}

// ============================================================
// PHEROMONE HELPERS
// ============================================================

function pheromoneKey(x: number, y: number): string {
  return `${x},${y}`;
}

function addPheromone(state: GameState, x: number, y: number, type: PheromoneType, strength: number) {
  if (state.resources.pheromones <= 0.1) return;
  const key = pheromoneKey(x, y);
  const existing = state.pheromoneMap.get(key);

  // Pheromone chamber boost
  const cell = state.map[y]?.[x];
  let boost = 1;
  if (cell?.chamberType === ChamberType.PheromoneChamber) boost = 1.3;

  const finalStrength = Math.min(PHEROMONE_SETTINGS.maxStrength, strength * boost);

  if (existing && existing.strength >= finalStrength) return;

  state.pheromoneMap.set(key, { type, strength: finalStrength, x, y, age: 0 });
  state.resources.pheromones = Math.max(0, state.resources.pheromones - 0.03);
}

function getStrongestPheromone(state: GameState, x: number, y: number): PheromoneType | null {
  let best: PheromoneType | null = null;
  let bestStrength = 0;

  const radius = PHEROMONE_SETTINGS.attractionRadius;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const key = pheromoneKey(x + dx, y + dy);
      const p = state.pheromoneMap.get(key);
      if (p && p.strength > bestStrength) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        const falloff = 1 / (1 + dist * 0.3);
        const effective = p.strength * falloff;
        if (effective > bestStrength) {
          bestStrength = effective;
          best = p.type;
        }
      }
    }
  }

  return best;
}

function getPheromoneDirection(state: GameState, x: number, y: number, type: PheromoneType): { x: number; y: number } | null {
  // Follow pheromone gradient - find the strongest nearby pheromone of this type
  let bestTarget: { x: number; y: number } | null = null;
  let bestStrength = 0;

  const radius = PHEROMONE_SETTINGS.attractionRadius;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const key = pheromoneKey(x + dx, y + dy);
      const p = state.pheromoneMap.get(key);
      if (p && p.type === type) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        const falloff = 1 / (1 + dist * 0.2);
        const effective = p.strength * falloff;
        if (effective > bestStrength) {
          bestStrength = effective;
          bestTarget = { x: x + dx, y: y + dy };
        }
      }
    }
  }

  return bestTarget;
}

// ============================================================
// FOG OF WAR
// ============================================================

function updateFogOfWar(state: GameState) {
  // Reset explored status near ants
  for (const ant of state.ants) {
    if (ant.state === AntState.Dead) continue;
    const visionRange = ANT_STATS[ant.caste].visionRange;
    const ax = Math.round(ant.x);
    const ay = Math.round(ant.y);

    for (let dy = -visionRange; dy <= visionRange; dy++) {
      for (let dx = -visionRange; dx <= visionRange; dx++) {
        const nx = ax + dx;
        const ny = ay + dy;
        if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= visionRange) {
            state.map[ny][nx].explored = true;
          }
        }
      }
    }
  }

  // Update light levels - only for explored cells near ants (not entire grid)
  const litCells = new Set<string>();

  // Surface cells: update based on time of day (only a narrow band)
  const surfaceLight = 0.3 + state.ambientLight * 0.7;
  for (let x = 0; x < MAP_WIDTH; x++) {
    for (let y = 0; y < SURFACE_ROW; y++) {
      state.map[y][x].lightLevel = surfaceLight;
    }
  }

  // Underground: only update explored tunnel/chamber cells near ants
  for (const ant of state.ants) {
    if (ant.state === AntState.Dead) continue;
    const ax = Math.round(ant.x);
    const ay = Math.round(ant.y);
    const lightRange = 6;
    for (let dy = -lightRange; dy <= lightRange; dy++) {
      for (let dx = -lightRange; dx <= lightRange; dx++) {
        const nx = ax + dx;
        const ny = ay + dy;
        if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT && ny >= SURFACE_ROW) {
          const key = `${nx},${ny}`;
          if (litCells.has(key)) continue;
          litCells.add(key);

          const cell = state.map[ny][nx];
          if (cell.terrain === TerrainType.Tunnel || cell.terrain === TerrainType.Chamber) {
            let light = FOG_SETTINGS.tunnelLight;
            if (cell.chamberType) light = FOG_SETTINGS.chamberLight;
            // Ants nearby provide some light
            for (const otherAnt of state.ants) {
              if (otherAnt.state === AntState.Dead) continue;
              const dist = Math.sqrt((otherAnt.x - nx) ** 2 + (otherAnt.y - ny) ** 2);
              if (dist < 4) {
                light += 0.15 * (1 - dist / 4);
              }
            }
            cell.lightLevel = Math.min(1, light);
          } else {
            const depth = ny - SURFACE_ROW;
            cell.lightLevel = Math.max(0, 0.1 - depth * 0.003);
          }
        }
      }
    }
  }
}

// ============================================================
// GAME TICK - Main simulation loop
// ============================================================

export function gameTick(state: GameState): GameState {
  if (!state.running || state.paused) return state;

  const newState = { ...state };
  newState.tick++;
  newState.dayProgress = (newState.tick % TICKS_PER_DAY) / TICKS_PER_DAY;
  newState.timeOfDay = newState.dayProgress;

  if (newState.tick % TICKS_PER_DAY === 0) {
    newState.day++;
  }

  // Ambient light based on time of day
  const noon = 0.5;
  const distFromNoon = Math.abs(newState.timeOfDay - noon) / noon;
  newState.ambientLight = Math.max(0.2, 1 - distFromNoon * distFromNoon);

  // Deep clone
  newState.ants = state.ants.map(a => ({ ...a, memory: { ...a.memory, resourceLocations: [...a.memory.resourceLocations], visitedChambers: [...a.memory.visitedChambers] } }));
  newState.enemies = state.enemies.map(e => ({ ...e }));
  newState.events = state.events.map(e => ({ ...e }));
  newState.brood = (state.brood || []).map(b => ({ ...b }));
  newState.surfaceDeposits = state.surfaceDeposits.map(d => ({ ...d }));
  newState.map = state.map.map(row => row.map(cell => ({ ...cell })));
  newState.pheromoneMap = new Map(state.pheromoneMap);
  newState.resources = { ...state.resources };
  newState.colonyMind = { ...state.colonyMind, abilities: state.colonyMind.abilities.map(a => ({ ...a })) };
  newState.notifications = [...state.notifications];
  newState.evolutions = state.evolutions.map(e => ({ ...e }));
  newState.influenceMap = state.influenceMap.map(row => row.map(cell => ({ ...cell })));

  // Systems execution order
  consumeResources(newState);
  updateBrood(newState);
  queenLayEggs(newState);
  updateAntAI(newState);
  updateEnemyAI(newState);
  processCombat(newState);
  decayPheromones(newState);
  diffusePheromones(newState);
  updateInfluenceMap(newState);
  updateEvents(newState);
  maybeSpawnEvent(newState);
  maybeSpawnSurfaceResources(newState);
  maybeSpawnEnemies(newState);
  updateWaterLevels(newState);
  updateContamination(newState);
  updateTemperature(newState);
  updateFogOfWar(newState);
  updateColonyMind(newState);
  updateGamePhase(newState);
  updateColonyScore(newState);

  // Cleanup
  newState.ants = newState.ants.filter(a => a.state !== AntState.Dead);
  newState.enemies = newState.enemies.filter(e => e.health > 0);
  newState.surfaceDeposits = newState.surfaceDeposits.filter(d => d.amount > 0 || !d.depleted);
  newState.queenAlive = newState.ants.some(a => a.caste === AntCaste.Queen);

  // Clean old notifications
  newState.notifications = newState.notifications.filter(n => newState.tick - n.tick < 400);

  return newState;
}

// ============================================================
// RESOURCE CONSUMPTION
// ============================================================

function consumeResources(state: GameState) {
  let totalFoodConsumption = 0;
  let totalProteinConsumption = 0;

  for (const ant of state.ants) {
    if (ant.state === AntState.Dead) continue;
    const stats = ANT_STATS[ant.caste];
    totalFoodConsumption += stats.foodConsumption;
    totalProteinConsumption += stats.proteinConsumption;

    ant.hunger = Math.min(1, ant.hunger + stats.foodConsumption * 0.0005);

    // Fatigue increases from work
    if (ant.state !== AntState.Idle && ant.state !== AntState.Resting && ant.state !== AntState.Dead) {
      ant.fatigue = Math.min(1, ant.fatigue + stats.fatigueRate);
    } else if (ant.state === AntState.Resting) {
      ant.fatigue = Math.max(0, ant.fatigue - stats.restRate);
    }

    // Starvation damage
    if (ant.hunger > 0.8) {
      ant.health -= 0.3;
      if (ant.health <= 0) {
        ant.state = AntState.Dead;
        state.totalAntsLost++;
      }
    }

    // Extreme fatigue slows ants
    if (ant.fatigue > 0.8) {
      ant.speed = ANT_STATS[ant.caste].speed * 0.4;
    } else {
      ant.speed = ANT_STATS[ant.caste].speed;
    }
  }

  // Feed from stores
  const foodNeeded = totalFoodConsumption * 0.008;
  const proteinNeeded = totalProteinConsumption * 0.008;

  if (state.resources.food > 0) {
    const consumed = Math.min(state.resources.food, foodNeeded);
    state.resources.food -= consumed;
    for (const ant of state.ants) {
      if (ant.state !== AntState.Dead && consumed > 0) {
        ant.hunger = Math.max(0, ant.hunger - consumed * 0.08);
      }
    }
  }

  if (state.resources.protein > 0) {
    state.resources.protein = Math.max(0, state.resources.protein - proteinNeeded);
  }

  // Fungus chamber produces food
  for (const row of state.map) {
    for (const cell of row) {
      if (cell.chamberType === ChamberType.FungusChamber && state.resources.leafFragments > 0.01) {
        state.resources.fungus += 0.008 * cell.soilNutrients;
        state.resources.leafFragments = Math.max(0, state.resources.leafFragments - 0.003);
      }
    }
  }

  // Fungus converts to food slowly
  if (state.resources.fungus > 1) {
    state.resources.food += state.resources.fungus * 0.02;
    state.resources.fungus *= 0.98;
  }

  // Pheromone regeneration
  state.resources.pheromones = Math.min(100, state.resources.pheromones + 0.01);
  // Water regeneration
  state.resources.water = Math.min(100, state.resources.water + 0.005);
}

// ============================================================
// BROOD SYSTEM
// ============================================================

function updateBrood(state: GameState) {
  const newAnts: Ant[] = [];

  for (const brood of state.brood) {
    const cell = state.map[brood.y]?.[brood.x];

    if (brood.stage === BroodStage.Larva) {
      if (state.resources.food > BROOD_TIMING.foodPerLarvaPerTick) {
        state.resources.food -= BROOD_TIMING.foodPerLarvaPerTick;
        brood.progress += 1 / BROOD_TIMING.larvaToPupa;
        brood.needsFood = false;
      } else {
        brood.needsFood = true;
        brood.health -= 0.3;
      }
    } else if (brood.stage === BroodStage.Egg) {
      brood.progress += 1 / BROOD_TIMING.eggToLarva;
    } else if (brood.stage === BroodStage.Pupa) {
      brood.progress += 1 / BROOD_TIMING.pupaToHatch;
    }

    // Brood chamber bonus
    if (cell?.chamberType === ChamberType.BroodChamber || cell?.chamberType === ChamberType.NurseryChamber) {
      brood.progress += 0.0002;
    }

    if (brood.progress >= 1) {
      if (brood.stage === BroodStage.Egg) {
        brood.stage = BroodStage.Larva;
        brood.progress = 0;
      } else if (brood.stage === BroodStage.Larva) {
        brood.stage = BroodStage.Pupa;
        brood.progress = 0;
      } else if (brood.stage === BroodStage.Pupa) {
        const pos = findNearestWalkable(state.map, brood.x, brood.y);
        if (pos) {
          newAnts.push(createAnt(brood.caste, pos.x, pos.y));
          state.totalAntsHatched++;
          addNotification(state, `A new ${brood.caste} has hatched!`, 'success');
        }
        brood.health = 0;
      }
    }

    // Environmental damage
    if (cell) {
      if (cell.waterLevel > 0.5) brood.health -= 1.5;
      if (cell.contamination > 0.5) brood.health -= 0.8;
      if (cell.temperature < 0.2 || cell.temperature > 0.9) brood.health -= 0.4;
      // Nursery chamber protection
      if (cell.chamberType === ChamberType.NurseryChamber) {
        brood.health = Math.min(100, brood.health + 0.2);
      }
    }
  }

  state.brood = state.brood.filter(b => b.health > 0);
  state.ants.push(...newAnts);
}

// ============================================================
// QUEEN EGG LAYING
// ============================================================

function queenLayEggs(state: GameState) {
  const queen = state.ants.find(a => a.caste === AntCaste.Queen && a.state !== AntState.Dead);
  if (!queen) return;

  // Dynamic egg laying rate based on food supply
  const foodSupplyFactor = Math.min(1, state.resources.food / 30); // 0-1, higher with more food
  const eggInterval = Math.floor(80 / (0.4 + foodSupplyFactor * 0.6)); // Faster when more food (40-80 ticks)
  if (state.tick % eggInterval !== 0) return;
  if (state.resources.food < 4) return;
  // Dynamic brood cap scaling with colony size
  const livingAnts = state.ants.filter(a => a.state !== AntState.Dead).length;
  const maxBrood = 20 + Math.floor(livingAnts * 0.5);
  if (state.brood.length > maxBrood) return;

  // Find brood chamber (or queen chamber as fallback)
  let broodX = queen.x;
  let broodY = queen.y;

  const broodChambers: { x: number; y: number; count: number }[] = [];
  for (const row of state.map) {
    for (const cell of row) {
      if (cell.chamberType === ChamberType.BroodChamber || cell.chamberType === ChamberType.NurseryChamber) {
        const count = state.brood.filter(b =>
          Math.abs(b.x - cell.x) < 4 && Math.abs(b.y - cell.y) < 4
        ).length;
        broodChambers.push({ x: cell.x, y: cell.y, count });
      }
    }
  }

  // Use chamber with fewest brood
  if (broodChambers.length > 0) {
    broodChambers.sort((a, b) => a.count - b.count);
    broodX = broodChambers[0].x;
    broodY = broodChambers[0].y;
  }

  // Intelligent caste selection based on colony needs
  const aliveAnts = state.ants.filter(a => a.state !== AntState.Dead);
  const casteCounts: Record<string, number> = {};
  for (const a of aliveAnts) {
    casteCounts[a.caste] = (casteCounts[a.caste] || 0) + 1;
  }

  const total = aliveAnts.length;
  let caste = AntCaste.Worker;

  // Priority-based caste selection
  const soldierRatio = (casteCounts[AntCaste.Soldier] || 0) / total;
  const workerRatio = (casteCounts[AntCaste.Worker] || 0) / total;
  const nurseRatio = (casteCounts[AntCaste.Nurse] || 0) / total;
  const scoutRatio = (casteCounts[AntCaste.Scout] || 0) / total;
  const builderRatio = (casteCounts[AntCaste.Builder] || 0) / total;
  const cultivatorRatio = (casteCounts[AntCaste.Cultivator] || 0) / total;

  // Smart caste selection: respond to threats with more soldiers
  const enemyThreatLevel = state.enemies.length; // more enemies = more threat
  const soldierCap = Math.min(0.3, 0.1 + enemyThreatLevel * 0.02); // Up to 30% soldiers under heavy threat

  if (enemyThreatLevel > 0 && soldierRatio < soldierCap && state.resources.protein >= 5) {
    caste = AntCaste.Soldier;
    state.resources.protein -= 2;
  } else if (scoutRatio < 0.05) {
    caste = AntCaste.Scout;
  } else if (state.brood.length > 3 && nurseRatio < 0.08) {
    caste = AntCaste.Nurse;
  } else if (workerRatio < 0.5) {
    caste = AntCaste.Worker;
  } else if (soldierRatio < Math.max(0.1, soldierCap * 0.7) && state.resources.protein >= 3) {
    caste = AntCaste.Soldier;
    state.resources.protein -= 1;
  } else if (builderRatio < 0.08) {
    caste = AntCaste.Builder;
  } else if (cultivatorRatio < 0.06 && state.map.flat().some(c => c.chamberType === ChamberType.FungusChamber)) {
    caste = AntCaste.Cultivator;
  }

  state.resources.food -= 3;

  state.brood.push({
    id: genId(),
    stage: BroodStage.Egg,
    caste,
    x: broodX,
    y: broodY,
    progress: 0,
    health: 100,
    needsFood: false,
    temperature: state.map[broodY]?.[broodX]?.temperature || 0.5,
  });
}

// ============================================================
// ANT AI - Priority-based emergent behavior
// ============================================================

function updateAntAI(state: GameState) {
  for (const ant of state.ants) {
    if (ant.state === AntState.Dead) continue;

    ant.age++;
    ant.animationFrame += 0.15;
    ant.memory.dangerTimer = Math.max(0, ant.memory.dangerTimer - 1);

    // Die of old age
    if (ant.age >= ant.maxAge) {
      ant.state = AntState.Dead;
      state.totalAntsLost++;
      continue;
    }

    // Rest when very fatigued
    if (ant.fatigue > 0.9 && ant.state !== AntState.Resting) {
      ant.prevState = ant.state;
      ant.state = AntState.Resting;
      ant.stateTimer = 60;
    }

    if (ant.state === AntState.Resting) {
      ant.stateTimer--;
      if (ant.stateTimer <= 0 || ant.fatigue < 0.1) {
        ant.state = ant.prevState || AntState.Idle;
      }
      continue;
    }

    // Process based on caste
    switch (ant.caste) {
      case AntCaste.Queen: updateQueenAI(state, ant); break;
      case AntCaste.Worker: updateWorkerAI(state, ant); break;
      case AntCaste.Scout: updateScoutAI(state, ant); break;
      case AntCaste.Soldier: updateSoldierAI(state, ant); break;
      case AntCaste.Nurse: updateNurseAI(state, ant); break;
      case AntCaste.Builder: updateBuilderAI(state, ant); break;
      case AntCaste.Cultivator: updateCultivatorAI(state, ant); break;
    }

    moveAlongPath(state, ant);

    // Emit pheromones based on state
    if (state.tick - ant.lastPheromoneTick > 10) {
      const ax = Math.round(ant.x);
      const ay = Math.round(ant.y);

      if (ant.state === AntState.Carrying) {
        addPheromone(state, ax, ay, PheromoneType.Food, 0.3);
      }
      if (ant.state === AntState.Fighting) {
        addPheromone(state, ax, ay, PheromoneType.Danger, 0.6);
      }

      ant.lastPheromoneTick = state.tick;
    }

    // Update facing angle smoothly
    if (ant.path.length > ant.pathIndex) {
      const target = ant.path[ant.pathIndex];
      const targetAngle = Math.atan2(target.y - ant.y, target.x - ant.x);
      const diff = targetAngle - ant.facingAngle;
      ant.facingAngle += diff * 0.3;
    }
  }
}

function moveAlongPath(state: GameState, ant: Ant) {
  if (ant.path.length > 0 && ant.pathIndex < ant.path.length) {
    const target = ant.path[ant.pathIndex];
    const dx = target.x - ant.x;
    const dy = target.y - ant.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < ant.speed * 1.2) {
      ant.x = target.x;
      ant.y = target.y;
      ant.pathIndex++;

      // Tunnel quality affects fatigue
      const cell = state.map[Math.round(ant.y)]?.[Math.round(ant.x)];
      if (cell) {
        if (cell.tunnelQuality < 0.3) {
          ant.fatigue = Math.min(1, ant.fatigue + 0.001);
        }
      }
    } else {
      ant.x += (dx / dist) * ant.speed;
      ant.y += (dy / dist) * ant.speed;
    }

    if (ant.state !== AntState.Fighting && ant.state !== AntState.Excavating) {
      ant.state = AntState.Moving;
    }
  } else if (ant.state === AntState.Moving || ant.state === AntState.Returning) {
    ant.state = AntState.Idle;
    ant.path = [];
    ant.pathIndex = 0;
    ant.experience += 0.1;
  }
}

function assignPath(state: GameState, ant: Ant, tx: number, ty: number): boolean {
  const startX = Math.round(ant.x);
  const startY = Math.round(ant.y);
  const targetX = Math.round(tx);
  const targetY = Math.round(ty);

  if (startX === targetX && startY === targetY) return true;

  const path = findPathAStar(state.map, startX, startY, targetX, targetY);
  if (path.length > 0) {
    ant.path = path;
    ant.pathIndex = 0;
    ant.targetX = tx;
    ant.targetY = ty;
    return true;
  }
  return false;
}

// --- Queen AI ---
function updateQueenAI(state: GameState, ant: Ant) {
  if (ant.state === AntState.Idle) {
    const chamber = findChamberCenter(state, ChamberType.QueenChamber);
    if (chamber) {
      const dx = chamber.x - ant.x;
      const dy = chamber.y - ant.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        assignPath(state, ant, chamber.x, chamber.y);
      }
    }
  }

  // Queen emits home pheromone
  if (state.tick % 15 === 0) {
    addPheromone(state, Math.round(ant.x), Math.round(ant.y), PheromoneType.Home, 0.7);
  }
}

// --- Worker AI (Most complex) ---
function updateWorkerAI(state: GameState, ant: Ant) {
  const personality = PERSONALITY_MODIFIERS[ant.personality] || PERSONALITY_MODIFIERS.diligent;

  if (ant.state !== AntState.Idle && ant.state !== AntState.Moving && ant.stateTimer > 0) {
    ant.stateTimer--;
    if (ant.state === AntState.Excavating) {
      const digTarget = findExcavatableNeighbor(state, Math.round(ant.x), Math.round(ant.y));
      if (digTarget) {
        excavateCell(state, digTarget.x, digTarget.y);
        state.resources.compactEarth += 0.08;
      }
    }
    return;
  }

  ant.stateTimer = Math.floor((25 + Math.random() * 25) * personality.workDurationMul);

  // Emergency response: emit danger pheromone if a soldier died nearby
  for (const otherAnt of state.ants) {
    if (otherAnt.state === AntState.Dead && otherAnt.caste === AntCaste.Soldier) {
      const dist = Math.abs(ant.x - otherAnt.x) + Math.abs(ant.y - otherAnt.y);
      if (dist < 6) {
        addPheromone(state, Math.round(ant.x), Math.round(ant.y), PheromoneType.Danger, 0.6);
        break;
      }
    }
  }

  // PRIORITY 1: If carrying, deliver to closest storage (smart delivery)
  if (ant.carrying !== null) {
    // Find the closest food storage, not just any one
    const storage = findNearestChamber(state, ant.x, ant.y, ChamberType.FoodStorage) ||
      findNearestChamber(state, ant.x, ant.y, ChamberType.GranaryChamber) ||
      findNearestChamber(state, ant.x, ant.y, ChamberType.QueenChamber);

    if (storage) {
      const dist = Math.abs(ant.x - storage.x) + Math.abs(ant.y - storage.y);
      if (dist < 3) {
        const carriedType = ant.carrying;
        const carriedAmount = ant.carryAmount;
        const key = carriedType as keyof typeof state.resources;
        if (key in state.resources) {
          (state.resources as Record<string, number>)[key] += carriedAmount;
        }
        ant.carrying = null;
        ant.carryAmount = 0;
        ant.state = AntState.Idle;
        ant.experience += 0.5;
        addNotification(state, `+${Math.round(carriedAmount)} ${carriedType}`, 'info');

        // Remember this storage location for future deliveries
        ant.memory.visitedChambers = [
          ...ant.memory.visitedChambers.slice(-8),
          `${Math.round(storage.x)},${Math.round(storage.y)}`
        ];
      } else {
        assignPath(state, ant, storage.x, storage.y);
        ant.state = AntState.Carrying;
      }
    }
    return;
  }

  // PRIORITY 2: Flee from danger
  if (ant.memory.dangerTimer > 0 || (ant.hunger > 0.7 && personality.fleeThresholdMul < 1)) {
    const homeChamber = findNearestChamber(state, ant.x, ant.y, ChamberType.QueenChamber);
    if (homeChamber) {
      assignPath(state, ant, homeChamber.x, homeChamber.y);
      ant.state = AntState.Fleeing;
    }
    return;
  }

  // PRIORITY 3: Check pheromone directives
  const pheromoneDir = getStrongestPheromone(state, Math.round(ant.x), Math.round(ant.y));

  if (pheromoneDir === PheromoneType.Collect) {
    // Follow food pheromone gradient
    const foodTarget = getPheromoneDirection(state, Math.round(ant.x), Math.round(ant.y), PheromoneType.Food) ||
      getPheromoneDirection(state, Math.round(ant.x), Math.round(ant.y), PheromoneType.Collect);

    if (foodTarget) {
      const deposit = findNearestSurfaceDeposit(state, ant);
      if (deposit) {
        const dist = Math.abs(ant.x - deposit.x) + Math.abs(ant.y - deposit.y);
        if (dist < 2) {
          const amount = Math.min(ant.carryCapacity, deposit.amount);
          ant.carrying = deposit.type;
          ant.carryAmount = amount;
          deposit.amount -= amount;
          ant.state = AntState.Harvesting;
          ant.experience += 0.3;
          addPheromone(state, Math.round(ant.x), Math.round(ant.y), PheromoneType.Food, 0.5);
          // Remember where we picked up food for foraging efficiency
          ant.memory.lastFoodSource = { x: deposit.x, y: deposit.y };
          ant.memory.resourceLocations = [
            ...ant.memory.resourceLocations.slice(-5),
            { x: deposit.x, y: deposit.y, type: deposit.type }
          ];
        } else {
          assignPath(state, ant, deposit.x, deposit.y);
          ant.state = AntState.Moving;
        }
      } else {
        assignPath(state, ant, foodTarget.x, foodTarget.y);
        ant.state = AntState.Moving;
      }
    } else {
      // No food pheromone to follow - check memory for known resource locations first
      const memoryFood = ant.memory.lastFoodSource;
      if (memoryFood && Math.random() < 0.5) {
        // Return to last known food source
        assignPath(state, ant, memoryFood.x, memoryFood.y);
        ant.state = AntState.Moving;
      } else if (ant.memory.resourceLocations.length > 0 && Math.random() < 0.4) {
        // Try a known resource location from memory
        const loc = ant.memory.resourceLocations[Math.floor(Math.random() * ant.memory.resourceLocations.length)];
        assignPath(state, ant, loc.x, loc.y);
        ant.state = AntState.Moving;
      } else {
        const deposit = findNearestSurfaceDeposit(state, ant);
        if (deposit) {
          assignPath(state, ant, deposit.x, deposit.y);
          ant.state = AntState.Moving;
        } else {
          wanderAnt(state, ant);
        }
      }
    }
  } else if (pheromoneDir === PheromoneType.Excavate) {
    const digTarget = findExcavatableNeighbor(state, Math.round(ant.x), Math.round(ant.y));
    if (digTarget) {
      excavateCell(state, digTarget.x, digTarget.y);
      ant.state = AntState.Excavating;
      ant.stateTimer = 15;
      state.resources.compactEarth += 0.1;
    } else {
      // Move toward excavate pheromone source
      const target = getPheromoneDirection(state, Math.round(ant.x), Math.round(ant.y), PheromoneType.Excavate);
      if (target) {
        assignPath(state, ant, target.x, target.y);
      } else {
        wanderAnt(state, ant);
      }
    }
  } else if (pheromoneDir === PheromoneType.Evacuate) {
    const homeChamber = findNearestChamber(state, ant.x, ant.y, ChamberType.QueenChamber);
    if (homeChamber) {
      assignPath(state, ant, homeChamber.x, homeChamber.y);
      ant.state = AntState.Fleeing;
    }
  } else if (pheromoneDir === PheromoneType.Danger) {
    // Flee from danger
    if (personality.fleeThresholdMul > 1) {
      // Cautious - flee far
      const home = findNearestChamber(state, ant.x, ant.y, ChamberType.QueenChamber);
      if (home) {
        assignPath(state, ant, home.x, home.y);
        ant.state = AntState.Fleeing;
      }
    }
  } else {
    // PRIORITY 4: Default behavior - check memory first, then collect food
    const memoryFood = ant.memory.lastFoodSource;
    if (memoryFood && Math.random() < 0.4) {
      // Return to last known food source for foraging efficiency
      assignPath(state, ant, memoryFood.x, memoryFood.y);
      ant.state = AntState.Moving;
    } else if (ant.memory.resourceLocations.length > 0 && Math.random() < 0.3) {
      // Try a known resource location from memory
      const loc = ant.memory.resourceLocations[Math.floor(Math.random() * ant.memory.resourceLocations.length)];
      assignPath(state, ant, loc.x, loc.y);
      ant.state = AntState.Moving;
    } else {
      const deposit = findNearestSurfaceDeposit(state, ant);
      if (deposit && Math.random() < 0.6) {
        assignPath(state, ant, deposit.x, deposit.y);
        ant.state = AntState.Moving;
      } else {
        wanderAnt(state, ant);
      }
    }
  }
}

// --- Scout AI ---
function updateScoutAI(state: GameState, ant: Ant) {
  const personality = PERSONALITY_MODIFIERS[ant.personality] || PERSONALITY_MODIFIERS.curious;

  if (ant.state !== AntState.Idle && ant.state !== AntState.Moving && ant.state !== AntState.Exploring && ant.stateTimer > 0) {
    ant.stateTimer--;
    return;
  }

  ant.stateTimer = Math.floor((40 + Math.random() * 40) * personality.workDurationMul);

  // Scouts explore the surface and mark food
  if (ant.y < SURFACE_ROW) {
    // On surface - look for resources and mark them
    for (const deposit of state.surfaceDeposits) {
      const dist = Math.abs(ant.x - deposit.x) + Math.abs(ant.y - deposit.y);
      if (dist < 6 && deposit.amount > 0) {
        addPheromone(state, Math.round(ant.x), Math.round(ant.y), PheromoneType.Food, 0.6);
        addPheromone(state, deposit.x, deposit.y, PheromoneType.Collect, 0.7);
        ant.memory.lastFoodSource = { x: deposit.x, y: deposit.y };
        ant.memory.resourceLocations = [
          ...ant.memory.resourceLocations.slice(-5),
          { x: deposit.x, y: deposit.y, type: deposit.type }
        ];
      }
    }

    // Danger reporting: emit strong danger pheromone AND flee when spotting enemies
    for (const enemy of state.enemies) {
      const dist = Math.abs(ant.x - enemy.x) + Math.abs(ant.y - enemy.y);
      if (dist < enemy.aggroRange * 1.5) {
        // Emit danger pheromone more frequently and at higher strength
        addPheromone(state, Math.round(ant.x), Math.round(ant.y), PheromoneType.Danger, 0.8);
        addPheromone(state, Math.round(ant.x), Math.round(ant.y), PheromoneType.Defend, 0.4);
        ant.memory.lastDangerLocation = { x: Math.round(enemy.x), y: Math.round(enemy.y) };
        // Flee back to colony immediately
        const entrance = findEntrance(state);
        if (entrance) {
          assignPath(state, ant, entrance.x, entrance.y);
          ant.state = AntState.Fleeing;
          return;
        }
      }
    }

    // Systematic exploration: expanding spiral pattern instead of random
    // Use time-based spiral offset for systematic coverage
    const spiralAngle = (ant.experience * 0.8) + (ant.id.charCodeAt(1) || 0) * 0.5;
    const spiralRadius = 5 + Math.min(ant.experience * 2, 30);
    const homeX = ant.memory.homePosition.x;
    const homeY = ant.memory.homePosition.y;
    let targetX = Math.round(homeX + Math.cos(spiralAngle) * spiralRadius);
    let targetY = Math.round(4 + Math.sin(spiralAngle) * 3); // Stay on surface

    // Clamp to surface bounds
    targetX = Math.max(2, Math.min(MAP_WIDTH - 3, targetX));
    targetY = Math.max(4, Math.min(SURFACE_ROW - 1, targetY));

    // Mix systematic exploration with some randomness for variety
    if (Math.random() < 0.3) {
      targetX = Math.floor(Math.random() * MAP_WIDTH);
      targetY = 4 + Math.floor(Math.random() * 4);
    }

    if (assignPath(state, ant, targetX, targetY)) {
      ant.state = AntState.Exploring;
    }
  } else {
    // Underground - go to surface to explore
    const entrance = findEntrance(state);
    if (entrance) {
      assignPath(state, ant, entrance.x, entrance.y - 2);
      ant.state = AntState.Exploring;
    } else {
      wanderAnt(state, ant);
    }
  }

  // Trail marking: emit explore pheromones more frequently (every 5 ticks instead of 8)
  if (state.tick % 5 === 0) {
    addPheromone(state, Math.round(ant.x), Math.round(ant.y), PheromoneType.Explore, 0.4);
  }
}

// --- Soldier AI ---
function updateSoldierAI(state: GameState, ant: Ant) {
  const personality = PERSONALITY_MODIFIERS[ant.personality] || PERSONALITY_MODIFIERS.brave;

  if (ant.state !== AntState.Idle && ant.state !== AntState.Moving && ant.state !== AntState.Patrolling && ant.stateTimer > 0) {
    ant.stateTimer--;
    return;
  }

  ant.stateTimer = Math.floor((20 + Math.random() * 15));

  // Retreat when low health (< 20%)
  if (ant.health < ant.maxHealth * 0.2 && ant.state !== AntState.Fleeing) {
    const barracks = findNearestChamber(state, ant.x, ant.y, ChamberType.Barracks);
    const homeChamber = findNearestChamber(state, ant.x, ant.y, ChamberType.QueenChamber);
    const retreatTarget = barracks || homeChamber;
    if (retreatTarget) {
      assignPath(state, ant, retreatTarget.x, retreatTarget.y);
      ant.state = AntState.Fleeing;
      // Emit danger pheromone while retreating
      addPheromone(state, Math.round(ant.x), Math.round(ant.y), PheromoneType.Defend, 0.3);
      return;
    }
  }

  // Check for defend pheromone or nearby enemies
  const pheromoneDir = getStrongestPheromone(state, Math.round(ant.x), Math.round(ant.y));
  const nearestEnemy = findNearestEnemy(state, ant);

  if (nearestEnemy) {
    const dist = Math.sqrt((ant.x - nearestEnemy.x) ** 2 + (ant.y - nearestEnemy.y) ** 2);
    if (dist < ant.speed * 2) {
      ant.state = AntState.Fighting;
      ant.targetX = nearestEnemy.x;
      ant.targetY = nearestEnemy.y;
    } else {
      assignPath(state, ant, nearestEnemy.x, nearestEnemy.y);
      ant.state = AntState.Fighting;
    }
    // Emit alarm pheromone
    addPheromone(state, Math.round(ant.x), Math.round(ant.y), PheromoneType.Defend, 0.5);

    // Spread out from other soldiers fighting the same enemy (formation)
    const nearbyAllies = state.ants.filter(a =>
      a.caste === AntCaste.Soldier && a.state === AntState.Fighting &&
      a.id !== ant.id && Math.abs(a.x - ant.x) + Math.abs(a.y - ant.y) < 3
    );
    if (nearbyAllies.length > 0) {
      // Offset position to spread formation
      const offsetAngle = (nearbyAllies.indexOf(ant) ?? 0) * (Math.PI * 2 / Math.max(nearbyAllies.length, 1));
      const offsetDist = 2;
      const formX = Math.round(nearestEnemy.x + Math.cos(offsetAngle) * offsetDist);
      const formY = Math.round(nearestEnemy.y + Math.sin(offsetAngle) * offsetDist);
      assignPath(state, ant, formX, formY);
    }
  } else if (pheromoneDir === PheromoneType.Defend || pheromoneDir === PheromoneType.Danger) {
    // Follow defend pheromone to danger
    const target = getPheromoneDirection(state, Math.round(ant.x), Math.round(ant.y), PheromoneType.Danger) ||
      getPheromoneDirection(state, Math.round(ant.x), Math.round(ant.y), PheromoneType.Defend);
    if (target) {
      assignPath(state, ant, target.x, target.y);
      ant.state = AntState.Fighting;
    }
  } else {
    // Patrol between key chambers (queen chamber, entrances, barracks)
    const barracks = findNearestChamber(state, ant.x, ant.y, ChamberType.Barracks);
    const queenChamber = findNearestChamber(state, ant.x, ant.y, ChamberType.QueenChamber);
    const entrance = findEntrance(state);

    // Cycle between patrol points
    const patrolPoints: { x: number; y: number }[] = [];
    if (queenChamber) patrolPoints.push(queenChamber);
    if (entrance) patrolPoints.push(entrance);
    if (barracks) patrolPoints.push(barracks);

    if (patrolPoints.length > 0) {
      // Choose the patrol point farthest from current position for better coverage
      patrolPoints.sort((a, b) => {
        const distA = Math.abs(ant.x - a.x) + Math.abs(ant.y - a.y);
        const distB = Math.abs(ant.x - b.x) + Math.abs(ant.y - b.y);
        return distB - distA;
      });
      const target = patrolPoints[0];
      const patrolX = target.x + (Math.random() - 0.5) * 6;
      const patrolY = target.y + (Math.random() - 0.5) * 4;
      assignPath(state, ant, Math.round(patrolX), Math.round(patrolY));
      ant.state = AntState.Patrolling;
    } else {
      wanderAnt(state, ant);
    }
  }
}

// --- Nurse AI ---
function updateNurseAI(state: GameState, ant: Ant) {
  if (ant.state !== AntState.Idle && ant.state !== AntState.Moving && ant.stateTimer > 0) {
    ant.stateTimer--;
    return;
  }

  ant.stateTimer = 15 + Math.floor(Math.random() * 15);

  // Priority feeding: find brood closest to hatching (highest progress) that needs care
  const needyBrood = state.brood
    .filter(b => b.needsFood || b.health < 80)
    .sort((a, b) => {
      // Prioritize by: highest progress (closest to hatching) first, then lowest health
      if (a.stage !== b.stage) {
        // Larvae and pupae are closer to hatching than eggs
        const stageOrder = { [BroodStage.Pupa]: 3, [BroodStage.Larva]: 2, [BroodStage.Egg]: 1 };
        return (stageOrder[b.stage] || 0) - (stageOrder[a.stage] || 0);
      }
      // Among same stage, prioritize higher progress (closer to hatching)
      if (Math.abs(b.progress - a.progress) > 0.1) return b.progress - a.progress;
      // Then by health (lowest health first)
      return a.health - b.health;
    })[0];

  if (needyBrood) {
    const dist = Math.abs(ant.x - needyBrood.x) + Math.abs(ant.y - needyBrood.y);
    if (dist < 3) {
      if (state.resources.food > 0.3) {
        state.resources.food -= 0.08;
        needyBrood.health = Math.min(100, needyBrood.health + 3);
        needyBrood.needsFood = false;
        needyBrood.progress += 0.005;
      }
      ant.state = AntState.Nursing;

      // Temperature management: if brood is in a bad environment, try to move it
      const broodCell = state.map[needyBrood.y]?.[needyBrood.x];
      if (broodCell && (broodCell.temperature < 0.25 || broodCell.temperature > 0.85)) {
        // Find a better chamber for the brood (nursery or brood chamber with good temp)
        let bestChamber: { x: number; y: number; temp: number } | null = null;
        let bestTempScore = 1;
        for (const row of state.map) {
          for (const cell of row) {
            if (cell.chamberType === ChamberType.NurseryChamber || cell.chamberType === ChamberType.BroodChamber) {
              const tempDiff = Math.abs(cell.temperature - 0.55);
              if (tempDiff < bestTempScore) {
                bestTempScore = tempDiff;
                bestChamber = { x: cell.x, y: cell.y, temp: cell.temperature };
              }
            }
          }
        }
        if (bestChamber) {
          // Move the brood to a better chamber
          needyBrood.x = bestChamber.x;
          needyBrood.y = bestChamber.y;
        }
      }
    } else {
      assignPath(state, ant, needyBrood.x, needyBrood.y);
      ant.state = AntState.Nursing;
    }
  } else {
    // Wander near brood chambers
    const broodChamber = findNearestChamber(state, ant.x, ant.y, ChamberType.BroodChamber) ||
      findNearestChamber(state, ant.x, ant.y, ChamberType.NurseryChamber) ||
      findNearestChamber(state, ant.x, ant.y, ChamberType.QueenChamber);

    if (broodChamber) {
      const wx = broodChamber.x + (Math.random() - 0.5) * 5;
      const wy = broodChamber.y + (Math.random() - 0.5) * 5;
      assignPath(state, ant, Math.round(wx), Math.round(wy));
    } else {
      wanderAnt(state, ant);
    }
  }
}

// --- Builder AI ---
function updateBuilderAI(state: GameState, ant: Ant) {
  const personality = PERSONALITY_MODIFIERS[ant.personality] || PERSONALITY_MODIFIERS.diligent;

  if (ant.state !== AntState.Idle && ant.state !== AntState.Moving && ant.stateTimer > 0) {
    ant.stateTimer--;
    if (ant.state === AntState.Excavating) {
      const digTarget = findExcavatableNeighbor(state, Math.round(ant.x), Math.round(ant.y));
      if (digTarget) {
        excavateCell(state, digTarget.x, digTarget.y);
        excavateCell(state, digTarget.x, digTarget.y); // Double speed
        state.resources.compactEarth += 0.15;
      }
    }
    return;
  }

  ant.stateTimer = Math.floor((25 + Math.random() * 20) * personality.workDurationMul);

  const pheromoneDir = getStrongestPheromone(state, Math.round(ant.x), Math.round(ant.y));

  if (pheromoneDir === PheromoneType.Excavate) {
    const digTarget = findExcavatableNeighbor(state, Math.round(ant.x), Math.round(ant.y));
    if (digTarget) {
      excavateCell(state, digTarget.x, digTarget.y);
      excavateCell(state, digTarget.x, digTarget.y);
      ant.state = AntState.Excavating;
      ant.stateTimer = 12;
      state.resources.compactEarth += 0.2;
    } else {
      const target = getPheromoneDirection(state, Math.round(ant.x), Math.round(ant.y), PheromoneType.Excavate);
      if (target) {
        assignPath(state, ant, target.x, target.y);
      } else {
        wanderAnt(state, ant);
      }
    }
  } else if (pheromoneDir === PheromoneType.Build) {
    // Build chamber if marked (placeholder for chamber construction AI)
    wanderAnt(state, ant);
  } else {
    // Smart excavation: prioritize digging toward unexplored areas or resource deposits
    // Also prioritize building chambers the colony needs most

    // Determine what chamber the colony needs most
    const neededChamberType = determineNeededChamber(state);

    // Smart excavation: dig toward unexplored areas
    const currentX = Math.round(ant.x);
    const currentY = Math.round(ant.y);

    // Find nearby unexplored cells adjacent to tunnels
    let bestDigTarget: { x: number; y: number; score: number } | null = null;

    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const nx = currentX + dx;
        const ny = currentY + dy;
        if (nx < 0 || nx >= MAP_WIDTH || ny < SURFACE_ROW || ny >= MAP_HEIGHT) continue;
        const cell = state.map[ny][nx];
        if (!cell.excavatable) continue;
        if (cell.terrain !== TerrainType.Dirt && cell.terrain !== TerrainType.HardDirt &&
          cell.terrain !== TerrainType.SurfaceDirt && cell.terrain !== TerrainType.Clay &&
          cell.terrain !== TerrainType.Sand) continue;

        // Check if this cell is adjacent to a tunnel or chamber (so it connects)
        let adjacentToWalkable = false;
        const dirs = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];
        for (const dir of dirs) {
          if (isWalkable(state.map, nx + dir.dx, ny + dir.dy)) {
            adjacentToWalkable = true;
            break;
          }
        }
        if (!adjacentToWalkable) continue;

        // Score: prefer unexplored areas and cells near resource deposits
        let score = 0;
        if (!cell.explored) score += 3; // Unexplored = high priority
        // Near surface deposits = good for access tunnels
        for (const deposit of state.surfaceDeposits) {
          const depDist = Math.abs(nx - deposit.x) + Math.abs(ny - deposit.y);
          if (depDist < 8) score += 2;
        }
        // Prefer softer terrain
        score += (1 - cell.hardness) * 2;
        // Prefer being near existing tunnels for connectivity
        for (const dir of dirs) {
          const adjCell = state.map[ny + dir.dy]?.[nx + dir.dx];
          if (adjCell?.terrain === TerrainType.Tunnel || adjCell?.terrain === TerrainType.Chamber) {
            score += 1;
          }
        }

        if (!bestDigTarget || score > bestDigTarget.score) {
          bestDigTarget = { x: nx, y: ny, score };
        }
      }
    }

    if (bestDigTarget && Math.random() < 0.5) {
      // Move toward the best dig target
      assignPath(state, ant, bestDigTarget.x, bestDigTarget.y);
      ant.state = AntState.Excavating;
      ant.stateTimer = 10;
    } else {
      // Default: look for things to excavate nearby tunnels
      const digTarget = findExcavatableNeighbor(state, Math.round(ant.x), Math.round(ant.y));
      if (digTarget && Math.random() < 0.3) {
        excavateCell(state, digTarget.x, digTarget.y);
        ant.state = AntState.Excavating;
        ant.stateTimer = 10;
        state.resources.compactEarth += 0.1;
      } else {
        wanderAnt(state, ant);
      }
    }
  }
}

// Helper: determine which chamber type the colony needs most
function determineNeededChamber(state: GameState): ChamberType | null {
  const chamberCounts: Partial<Record<ChamberType, number>> = {};
  for (const row of state.map) {
    for (const cell of row) {
      if (cell.chamberType) {
        chamberCounts[cell.chamberType] = (chamberCounts[cell.chamberType] || 0) + 1;
      }
    }
  }

  const aliveAnts = state.ants.filter(a => a.state !== AntState.Dead).length;

  // Priority-based needs
  if (!chamberCounts[ChamberType.FoodStorage] && aliveAnts > 8) return ChamberType.FoodStorage;
  if (!chamberCounts[ChamberType.BroodChamber] && state.brood.length > 3) return ChamberType.BroodChamber;
  if (!chamberCounts[ChamberType.Barracks] && state.enemies.length > 0) return ChamberType.Barracks;
  if (!chamberCounts[ChamberType.FungusChamber] && state.resources.leafFragments > 5) return ChamberType.FungusChamber;
  if (!chamberCounts[ChamberType.NurseryChamber] && state.brood.length > 6) return ChamberType.NurseryChamber;

  // Add more storage if colony is large
  if ((chamberCounts[ChamberType.FoodStorage] || 0) < 2 && aliveAnts > 15) return ChamberType.FoodStorage;

  return null;
}

// --- Cultivator AI ---
function updateCultivatorAI(state: GameState, ant: Ant) {
  if (ant.state !== AntState.Idle && ant.state !== AntState.Moving && ant.stateTimer > 0) {
    ant.stateTimer--;
    if (ant.state === AntState.Cultivating) {
      state.resources.fungus += 0.015;
    }
    return;
  }

  ant.stateTimer = 30 + Math.floor(Math.random() * 20);

  const fungusChamber = findNearestChamber(state, ant.x, ant.y, ChamberType.FungusChamber);

  if (fungusChamber) {
    const dist = Math.abs(ant.x - fungusChamber.x) + Math.abs(ant.y - fungusChamber.y);
    if (dist < 4) {
      ant.state = AntState.Cultivating;
      state.resources.fungus += 0.01;
      // Bring leaf fragments if available
      if (ant.carrying === ResourceType.LeafFragments) {
        state.resources.leafFragments += ant.carryAmount;
        ant.carrying = null;
        ant.carryAmount = 0;
      }
    } else {
      assignPath(state, ant, fungusChamber.x, fungusChamber.y);
    }
  } else {
    // Collect leaf fragments from surface
    const leafDeposit = state.surfaceDeposits.find(d => d.type === ResourceType.LeafFragments && d.amount > 0);
    if (leafDeposit) {
      const dist = Math.abs(ant.x - leafDeposit.x) + Math.abs(ant.y - leafDeposit.y);
      if (dist < 2) {
        ant.carrying = ResourceType.LeafFragments;
        ant.carryAmount = Math.min(ant.carryCapacity, leafDeposit.amount);
        leafDeposit.amount -= ant.carryAmount;
        ant.state = AntState.Carrying;
      } else {
        assignPath(state, ant, leafDeposit.x, leafDeposit.y);
      }
    } else {
      wanderAnt(state, ant);
    }
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function wanderAnt(state: GameState, ant: Ant) {
  const range = 6;
  const personality = PERSONALITY_MODIFIERS[ant.personality] || PERSONALITY_MODIFIERS.diligent;
  const effectiveRange = range * personality.exploreRangeMul;

  const wx = Math.round(ant.x + (Math.random() - 0.5) * effectiveRange);
  const wy = Math.round(ant.y + (Math.random() - 0.5) * effectiveRange);
  const clampedX = Math.max(0, Math.min(MAP_WIDTH - 1, wx));
  const clampedY = Math.max(SURFACE_ROW - 4, Math.min(MAP_HEIGHT - 1, wy));

  if (assignPath(state, ant, clampedX, clampedY)) {
    ant.state = AntState.Moving;
  }
}

function findChamberCenter(state: GameState, type: ChamberType): { x: number; y: number } | null {
  let sumX = 0, sumY = 0, count = 0;
  for (const row of state.map) {
    for (const cell of row) {
      if (cell.chamberType === type) {
        sumX += cell.x;
        sumY += cell.y;
        count++;
      }
    }
  }
  if (count === 0) return null;
  return { x: Math.round(sumX / count), y: Math.round(sumY / count) };
}

function findNearestChamber(state: GameState, x: number, y: number, type: ChamberType): { x: number; y: number } | null {
  // Find the nearest chamber cell from the given position
  let bestDist = Infinity;
  let bestCell: { x: number; y: number } | null = null;
  for (const row of state.map) {
    for (const cell of row) {
      if (cell.chamberType === type) {
        const dist = Math.abs(cell.x - x) + Math.abs(cell.y - y);
        if (dist < bestDist) {
          bestDist = dist;
          bestCell = { x: cell.x, y: cell.y };
        }
      }
    }
  }
  return bestCell;
}

function findEntrance(state: GameState): { x: number; y: number } | null {
  for (let x = 0; x < MAP_WIDTH; x++) {
    if (state.map[SURFACE_ROW]?.[x]?.terrain === TerrainType.Tunnel) {
      return { x, y: SURFACE_ROW };
    }
  }
  return null;
}

function findNearestSurfaceDeposit(state: GameState, ant: Ant): ResourceDeposit | null {
  let nearest: ResourceDeposit | null = null;
  let minDist = Infinity;

  for (const deposit of state.surfaceDeposits) {
    if (deposit.amount <= 0 || deposit.depleted) continue;
    const dist = Math.abs(ant.x - deposit.x) + Math.abs(ant.y - deposit.y);
    if (dist < minDist) {
      minDist = dist;
      nearest = deposit;
    }
  }
  return nearest;
}

function findNearestEnemy(state: GameState, ant: Ant): Enemy | null {
  let nearest: Enemy | null = null;
  let minDist = Infinity;
  const range = ANT_STATS[ant.caste].visionRange * 2;

  for (const enemy of state.enemies) {
    const dist = Math.sqrt((ant.x - enemy.x) ** 2 + (ant.y - enemy.y) ** 2);
    if (dist < minDist && dist < range) {
      minDist = dist;
      nearest = enemy;
    }
  }
  return nearest;
}

function findExcavatableNeighbor(state: GameState, x: number, y: number): { x: number; y: number } | null {
  const dirs = [
    { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
    { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
    { dx: -1, dy: -1 }, { dx: 1, dy: -1 },
    { dx: -1, dy: 1 }, { dx: 1, dy: 1 },
  ];

  // Prioritize cardinal directions
  for (const { dx, dy } of dirs) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT) {
      const cell = state.map[ny][nx];
      if (cell.excavatable && (cell.terrain === TerrainType.Dirt || cell.terrain === TerrainType.HardDirt ||
        cell.terrain === TerrainType.SurfaceDirt || cell.terrain === TerrainType.Clay || cell.terrain === TerrainType.Sand)) {
        return { x: nx, y: ny };
      }
    }
  }
  return null;
}

function excavateCell(state: GameState, x: number, y: number) {
  if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return;
  const cell = state.map[y][x];
  if (!cell.excavatable) return;

  const validTerrains = [TerrainType.Dirt, TerrainType.HardDirt, TerrainType.SurfaceDirt, TerrainType.Clay, TerrainType.Sand, TerrainType.Roots];
  if (!validTerrains.includes(cell.terrain)) return;

  // Builder ants excavate faster
  const digPower = 0.08 + (cell.terrain === TerrainType.Sand ? 0.15 : cell.terrain === TerrainType.HardDirt ? -0.03 : 0);

  cell.hardness -= digPower;
  if (cell.hardness <= 0) {
    cell.terrain = TerrainType.Tunnel;
    cell.hardness = 0;
    cell.excavatable = false;
    cell.tunnelQuality = 0.5; // Needs improvement
    cell.explored = true;
    cell.lightLevel = Math.max(cell.lightLevel, 0.3);
  }
}

function addNotification(state: GameState, message: string, type: 'info' | 'warning' | 'danger' | 'success', priority = 0) {
  if (state.notifications.length > 20) {
    state.notifications.shift();
  }
  state.notifications.push({
    id: genId(),
    message,
    type,
    tick: state.tick,
    priority,
  });
}

// ============================================================
// ENEMY AI - Type-specific behaviors with improved intelligence
// ============================================================

function updateEnemyAI(state: GameState) {
  for (const enemy of state.enemies) {
    if (enemy.health <= 0) continue;

    enemy.animationFrame += 0.1;

    if (enemy.stateTimer <= 0) {
      enemy.stateTimer = 15 + Math.floor(Math.random() * 25);

      // Different AI per enemy type
      switch (enemy.behavior) {
        case EnemyBehavior.Hunt: {
          // Hunt: actively seek ants - prefer weakest/closest prey
          const prey = findWeakestAnt(state, enemy);
          if (prey && distance(enemy, prey) < enemy.aggroRange) {
            // Ambush behavior: if spider, wait until prey is very close then strike
            if (enemy.type === EnemyType.Spider && distance(enemy, prey) > enemy.aggroRange * 0.4) {
              // Hold position, wait for prey to come closer
              break;
            }
            enemy.targetX = prey.x;
            enemy.targetY = prey.y;
          } else if (enemy.health < enemy.maxHealth * 0.25) {
            // Retreat: flee away from colony when health is low
            const entrance = findEntrance(state);
            if (entrance) {
              // Move away from entrance
              const fleeX = enemy.x + (enemy.x - entrance.x) * 0.5;
              const fleeY = enemy.y + (enemy.y - entrance.y) * 0.3;
              enemy.targetX = Math.max(0, Math.min(MAP_WIDTH - 1, fleeX));
              enemy.targetY = Math.max(3, Math.min(SURFACE_ROW + 5, fleeY));
            }
          } else {
            // Wander toward colony entrance
            const entrance = findEntrance(state);
            if (entrance) {
              enemy.targetX = entrance.x + (Math.random() - 0.5) * 10;
              enemy.targetY = entrance.y + (Math.random() - 0.5) * 5;
            }
          }

          // Wasp hit-and-run: attack then retreat
          if (enemy.type === EnemyType.Wasp && prey) {
            const distToPrey = distance(enemy, prey);
            if (distToPrey < 2) {
              // Just attacked, now retreat
              const retreatAngle = Math.atan2(enemy.y - prey.y, enemy.x - prey.x);
              enemy.targetX = enemy.x + Math.cos(retreatAngle) * 6;
              enemy.targetY = enemy.y + Math.sin(retreatAngle) * 4;
              enemy.targetX = Math.max(0, Math.min(MAP_WIDTH - 1, enemy.targetX));
              enemy.targetY = Math.max(3, Math.min(SURFACE_ROW + 5, enemy.targetY));
            }
          }
          break;
        }
        case EnemyBehavior.Raid: {
          // Raid: target resource chambers specifically and steal food
          const foodStorage = findNearestChamber(state, enemy.x, enemy.y, ChamberType.FoodStorage);
          const granary = findNearestChamber(state, enemy.x, enemy.y, ChamberType.GranaryChamber);
          const target = foodStorage || granary;

          if (target && distance(enemy, target) < 3) {
            // Steal food from the chamber
            const stealAmount = Math.min(3, state.resources.food);
            if (stealAmount > 0) {
              state.resources.food -= stealAmount;
              addNotification(state, `Rival ants stole ${Math.round(stealAmount)} food!`, 'danger');
              // After stealing, flee back
              const fleeAngle = Math.atan2(enemy.y - target.y, enemy.x - target.x);
              enemy.targetX = enemy.x + Math.cos(fleeAngle) * 15;
              enemy.targetY = Math.max(3, Math.min(SURFACE_ROW + 3, enemy.y - 3));
              enemy.targetX = Math.max(0, Math.min(MAP_WIDTH - 1, enemy.targetX));
            }
          } else if (target) {
            // Move toward food storage
            enemy.targetX = target.x + (Math.random() - 0.5) * 3;
            enemy.targetY = target.y + (Math.random() - 0.5) * 2;
          } else {
            // No storage found, go to entrance
            const entrance = findEntrance(state);
            if (entrance) {
              enemy.targetX = entrance.x + (Math.random() - 0.5) * 4;
              enemy.targetY = entrance.y + Math.random() * 3;
            }
          }

          // Group behavior: move toward other rival ants for coordinated raids
          const otherRivals = state.enemies.filter(e =>
            e.type === EnemyType.RivalAnt && e.id !== enemy.id &&
            distance(e, enemy) < 15
          );
          if (otherRivals.length > 0) {
            // Move toward the group center for coordination
            const groupCenterX = otherRivals.reduce((sum, e) => sum + e.x, 0) / otherRivals.length;
            const groupCenterY = otherRivals.reduce((sum, e) => sum + e.y, 0) / otherRivals.length;
            // Blend target with group movement
            enemy.targetX = enemy.targetX * 0.6 + groupCenterX * 0.4;
            enemy.targetY = enemy.targetY * 0.6 + groupCenterY * 0.4;
          }
          break;
        }
        case EnemyBehavior.Ambush: {
          // Antlion: create sand trap effect and pull ants
          const nearestAnt = findNearestAnt(state, enemy);
          if (nearestAnt) {
            const dist = distance(enemy, nearestAnt);
            if (dist < enemy.aggroRange * 2) {
              // Pull mechanic: draw the ant closer when within range
              const pullStrength = 0.15;
              nearestAnt.x += (enemy.x - nearestAnt.x) * pullStrength;
              nearestAnt.y += (enemy.y - nearestAnt.y) * pullStrength;
              // Mark danger pheromone at trap location
              addPheromone(state, Math.round(enemy.x), Math.round(enemy.y), PheromoneType.Danger, 0.3);
            }
            if (dist < enemy.aggroRange) {
              enemy.targetX = nearestAnt.x;
              enemy.targetY = nearestAnt.y;
            }
          }
          // Antlion stays mostly still (sand trap behavior)
          // Only tiny movement adjustments
          break;
        }
        case EnemyBehavior.Territorial: {
          // Territorial: patrol a specific zone around spawn area
          // Define patrol zone around current position
          const patrolRadius = 6;

          // Check for nearby ants - warning display before attacking
          const nearestAnt = findNearestAnt(state, enemy);
          if (nearestAnt) {
            const dist = distance(enemy, nearestAnt);
            if (dist < enemy.aggroRange * 0.6 && dist > enemy.aggroRange * 0.3) {
              // Warning display: move toward the ant aggressively but don't attack yet
              enemy.targetX = nearestAnt.x + (Math.random() - 0.5) * 2;
              enemy.targetY = nearestAnt.y + (Math.random() - 0.5) * 2;
              // Emit danger pheromone as warning
              addPheromone(state, Math.round(enemy.x), Math.round(enemy.y), PheromoneType.Danger, 0.2);
            } else if (dist <= enemy.aggroRange * 0.3) {
              // Close enough - attack!
              enemy.targetX = nearestAnt.x;
              enemy.targetY = nearestAnt.y;
            } else {
              // Patrol within zone
              enemy.targetX = enemy.x + (Math.random() - 0.5) * patrolRadius;
              enemy.targetY = enemy.y + (Math.random() - 0.5) * (patrolRadius * 0.5);
            }
          } else {
            // No ants nearby - patrol the zone
            enemy.targetX = enemy.x + (Math.random() - 0.5) * patrolRadius;
            enemy.targetY = enemy.y + (Math.random() - 0.5) * (patrolRadius * 0.5);
          }

          const clampedX = Math.max(0, Math.min(MAP_WIDTH - 1, enemy.targetX));
          const clampedY = Math.max(3, Math.min(SURFACE_ROW + 5, enemy.targetY));
          enemy.targetX = clampedX;
          enemy.targetY = clampedY;
          break;
        }
        default: {
          // Wander
          enemy.targetX = enemy.x + (Math.random() - 0.5) * 10;
          enemy.targetY = enemy.y + (Math.random() - 0.5) * 6;
          break;
        }
      }
    }

    // Move toward target
    const dx = enemy.targetX - enemy.x;
    const dy = enemy.targetY - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0.5) {
      enemy.x += (dx / dist) * enemy.speed;
      enemy.y += (dy / dist) * enemy.speed;
      enemy.facingAngle = Math.atan2(dy, dx);
    }

    // Keep within bounds
    enemy.x = Math.max(0, Math.min(MAP_WIDTH - 1, enemy.x));
    enemy.y = Math.max(3, Math.min(MAP_HEIGHT - 1, enemy.y));

    enemy.stateTimer--;
  }
}

// Find the weakest/closest ant for hunting enemies (prey selection)
function findWeakestAnt(state: GameState, enemy: Enemy): Ant | null {
  let best: Ant | null = null;
  let bestScore = Infinity;

  for (const ant of state.ants) {
    if (ant.state === AntState.Dead) continue;
    const dist = distance(enemy, ant);
    if (dist > enemy.aggroRange) continue;

    // Score: prefer closer ants AND ants with lower health (easier prey)
    // Lower score = higher priority
    const distScore = dist * 2;
    const healthScore = ant.health / ant.maxHealth * 5; // Weaker ants score lower
    const casteBonus = ant.caste === AntCaste.Queen ? -10 : // Queen is top target
      ant.caste === AntCaste.Nurse ? -3 : // Easy prey
        ant.caste === AntCaste.Worker ? -1 : // Normal prey
          ant.caste === AntCaste.Soldier ? 5 : // Dangerous
            0;
    const score = distScore + healthScore + casteBonus;

    if (score < bestScore) {
      bestScore = score;
      best = ant;
    }
  }
  return best;
}

function findNearestAnt(state: GameState, enemy: Enemy): Ant | null {
  let nearest: Ant | null = null;
  let minDist = Infinity;

  for (const ant of state.ants) {
    if (ant.state === AntState.Dead) continue;
    const dist = distance(enemy, ant);
    if (dist < minDist && dist < enemy.aggroRange) {
      minDist = dist;
      nearest = ant;
    }
  }
  return nearest;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// ============================================================
// COMBAT SYSTEM
// ============================================================

function processCombat(state: GameState) {
  // Check for Chemical Fury mind ability
  const furyActive = state.colonyMind.abilities.find(a => a.type === MindAbilityType.ChemicalFury && a.active);

  for (const ant of state.ants) {
    if (ant.state === AntState.Dead) continue;

    for (const enemy of state.enemies) {
      if (enemy.health <= 0) continue;

      const dist = distance(ant, enemy);

      if (dist < 1.5) {
        // Ant attacks enemy
        let antAttack = ant.attack * 0.08;
        // Experience bonus
        antAttack *= (1 + ant.experience * 0.01);
        // Chemical Fury bonus
        if (furyActive) antAttack *= 2;
        // Aggressive personality bonus
        const personality = PERSONALITY_MODIFIERS[ant.personality];
        if (personality) antAttack *= personality.attackAggressionMul;

        enemy.health -= antAttack;

        // Enemy attacks ant
        const enemyDamage = enemy.attack * 0.04;
        ant.health -= enemyDamage;

        ant.state = AntState.Fighting;
        ant.memory.dangerTimer = 100;

        // Release alarm pheromone
        addPheromone(state, Math.round(ant.x), Math.round(ant.y), PheromoneType.Danger, 0.8);
        addPheromone(state, Math.round(ant.x), Math.round(ant.y), PheromoneType.Defend, 0.6);

        if (ant.health <= 0) {
          ant.state = AntState.Dead;
          state.totalAntsLost++;
          const enemyName = ENEMY_STATS[enemy.type]?.name || enemy.type;
          addNotification(state, `A ${ant.caste} was killed by ${enemyName}!`, 'danger');
        }

        if (enemy.health <= 0) {
          // Drop loot
          for (const loot of enemy.lootTable) {
            const key = loot.type as keyof typeof state.resources;
            if (key in state.resources) {
              (state.resources as Record<string, number>)[key] += loot.amount;
            }
          }
          const enemyName = ENEMY_STATS[enemy.type]?.name || enemy.type;
          addNotification(state, `${enemyName} defeated!`, 'success');
        }
      }
    }
  }
}

// ============================================================
// PHEROMONE SYSTEM
// ============================================================

function decayPheromones(state: GameState) {
  const toRemove: string[] = [];

  state.pheromoneMap.forEach((p, key) => {
    p.strength -= PHEROMONE_SETTINGS.decayRate;
    p.age++;
    if (p.strength <= 0) {
      toRemove.push(key);
    }
  });

  toRemove.forEach(key => state.pheromoneMap.delete(key));
}

function diffusePheromones(state: GameState) {
  // Spread pheromones to nearby cells - optimized: only process cells with pheromones
  if (state.tick % 5 !== 0) return;
  if (state.pheromoneMap.size === 0) return;

  const additions: { x: number; y: number; type: PheromoneType; strength: number }[] = [];

  state.pheromoneMap.forEach((p) => {
    if (p.strength < 0.1) return;

    const dirs = [
      { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
      { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
    ];

    for (const { dx, dy } of dirs) {
      const nx = p.x + dx;
      const ny = p.y + dy;
      if (nx < 0 || nx >= MAP_WIDTH || ny < 0 || ny >= MAP_HEIGHT) continue;

      const key = pheromoneKey(nx, ny);
      const existing = state.pheromoneMap.get(key);

      if (!existing || (existing.type === p.type && existing.strength < p.strength * 0.7)) {
        additions.push({
          x: nx, y: ny,
          type: p.type,
          strength: p.strength * PHEROMONE_SETTINGS.diffuseRate,
        });
      }
    }
  });

  for (const a of additions) {
    const key = pheromoneKey(a.x, a.y);
    const existing = state.pheromoneMap.get(key);
    if (!existing || existing.strength < a.strength) {
      state.pheromoneMap.set(key, { type: a.type, strength: a.strength, x: a.x, y: a.y, age: 0 });
    }
  }
}

// ============================================================
// INFLUENCE MAP
// ============================================================

function updateInfluenceMap(state: GameState) {
  if (state.tick % 10 !== 0) return;

  // Only update cells near ants and enemies (not entire 100x70 grid)
  const cellsToUpdate = new Set<string>();

  // Mark cells near ants for update
  for (const ant of state.ants) {
    if (ant.state === AntState.Dead) continue;
    const ax = Math.round(ant.x);
    const ay = Math.round(ant.y);
    const r = 3;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const nx = ax + dx;
        const ny = ay + dy;
        if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT) {
          cellsToUpdate.add(`${nx},${ny}`);
        }
      }
    }
  }

  // Mark cells near enemies for update
  for (const enemy of state.enemies) {
    const ex = Math.round(enemy.x);
    const ey = Math.round(enemy.y);
    const r = 6;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const nx = ex + dx;
        const ny = ey + dy;
        if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT) {
          cellsToUpdate.add(`${nx},${ny}`);
        }
      }
    }
  }

  // Decay and update only marked cells
  cellsToUpdate.forEach(key => {
    const [cx, cy] = key.split(',').map(Number);
    const cell = state.influenceMap[cy]?.[cx];
    if (!cell) return;
    cell.collectPressure *= 0.95;
    cell.defendPressure *= 0.95;
    cell.explorePressure *= 0.95;
    cell.dangerLevel *= 0.95;
    cell.foodAttraction *= 0.95;
    cell.homeAttraction *= 0.95;
  });

  // Ants contribute to influence
  for (const ant of state.ants) {
    if (ant.state === AntState.Dead) continue;
    const ax = Math.round(ant.x);
    const ay = Math.round(ant.y);

    if (ax >= 0 && ax < MAP_WIDTH && ay >= 0 && ay < MAP_HEIGHT) {
      const cell = state.influenceMap[ay][ax];
      if (ant.caste === AntCaste.Soldier) cell.defendPressure += 0.1;
      if (ant.caste === AntCaste.Scout) cell.explorePressure += 0.1;
      if (ant.state === AntState.Carrying) cell.foodAttraction += 0.05;
    }
  }

  // Enemies contribute danger
  for (const enemy of state.enemies) {
    const ex = Math.round(enemy.x);
    const ey = Math.round(enemy.y);

    if (ex >= 0 && ex < MAP_WIDTH && ey >= 0 && ey < MAP_HEIGHT) {
      const radius = 5;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = ex + dx;
          const ny = ey + dy;
          if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= radius) {
              state.influenceMap[ny][nx].dangerLevel += 0.2 * (1 - dist / radius);
            }
          }
        }
      }
    }
  }
}

// ============================================================
// EVENTS SYSTEM
// ============================================================

function updateEvents(state: GameState) {
  for (const event of state.events) {
    event.timer--;

    switch (event.type) {
      case EventType.Rain: {
        for (let y = SURFACE_ROW; y < Math.min(SURFACE_ROW + 10, MAP_HEIGHT); y++) {
          for (let x = 0; x < MAP_WIDTH; x++) {
            if (state.map[y][x].terrain === TerrainType.Tunnel || state.map[y][x].terrain === TerrainType.Chamber) {
              state.map[y][x].waterLevel = Math.min(1, state.map[y][x].waterLevel + 0.001);
              state.map[y][x].humidity = Math.min(1, state.map[y][x].humidity + 0.0005);
            }
          }
        }
        break;
      }
      case EventType.Drought: {
        for (const row of state.map) {
          for (const cell of row) {
            cell.humidity = Math.max(0, cell.humidity - 0.0008);
            cell.waterLevel = Math.max(0, cell.waterLevel - 0.001);
          }
        }
        break;
      }
      case EventType.Collapse: {
        if (event.affectedArea) {
          const { x, y, radius } = event.affectedArea;
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < MAP_WIDTH && ny >= SURFACE_ROW && ny < MAP_HEIGHT) {
                if (state.map[ny][nx].terrain === TerrainType.Tunnel) {
                  state.map[ny][nx].terrain = TerrainType.Dirt;
                  state.map[ny][nx].hardness = 0.3;
                  state.map[ny][nx].excavatable = true;
                  state.map[ny][nx].tunnelQuality = 0;
                }
              }
            }
          }
          addNotification(state, 'Tunnel collapse!', 'danger', 3);
        }
        break;
      }
      case EventType.Pesticide: {
        for (const ant of state.ants) {
          if (ant.y < SURFACE_ROW + 2 && ant.state !== AntState.Dead) {
            ant.health -= 1.5;
            if (ant.health <= 0) {
              ant.state = AntState.Dead;
              state.totalAntsLost++;
            }
          }
        }
        break;
      }
      case EventType.ToxicFungus: {
        for (const row of state.map) {
          for (const cell of row) {
            if (cell.terrain === TerrainType.Chamber) {
              cell.contamination = Math.min(1, cell.contamination + 0.0008);
            }
          }
        }
        break;
      }
      case EventType.ColdSnap: {
        for (const row of state.map) {
          for (const cell of row) {
            cell.temperature = Math.max(0, cell.temperature - 0.001);
          }
        }
        break;
      }
      case EventType.HeatWave: {
        for (const row of state.map) {
          for (const cell of row) {
            cell.temperature = Math.min(1, cell.temperature + 0.001);
          }
        }
        break;
      }
      case EventType.EnemyRaid: {
        if (state.tick % 25 === 0) {
          spawnEnemyAtEdge(state);
        }
        break;
      }
      case EventType.Earthquake: {
        // Random collapses and shakes
        if (Math.random() < 0.02) {
          const rx = Math.floor(Math.random() * MAP_WIDTH);
          const ry = SURFACE_ROW + Math.floor(Math.random() * (MAP_HEIGHT - SURFACE_ROW - 5));
          if (state.map[ry]?.[rx]?.terrain === TerrainType.Tunnel) {
            state.map[ry][rx].terrain = TerrainType.Dirt;
            state.map[ry][rx].hardness = 0.3;
            state.map[ry][rx].excavatable = true;
          }
        }
        break;
      }
      case EventType.Flood: {
        for (let y = SURFACE_ROW; y < Math.min(SURFACE_ROW + 15, MAP_HEIGHT); y++) {
          for (let x = 0; x < MAP_WIDTH; x++) {
            if (state.map[y][x].terrain === TerrainType.Tunnel || state.map[y][x].terrain === TerrainType.Chamber) {
              state.map[y][x].waterLevel = Math.min(1, state.map[y][x].waterLevel + 0.003);
            }
          }
        }
        break;
      }
    }
  }

  state.events = state.events.filter(e => e.timer > 0);
}

function maybeSpawnEvent(state: GameState) {
  if (state.tick % 500 !== 0) return;
  if (state.events.length >= 3) return;

  // Probability increases with days
  const prob = 0.15 + state.day * 0.005;
  if (Math.random() > prob) return;

  const eventTypes = Object.values(EventType);

  // Contextual event weighting: more context-aware events
  const weights = eventTypes.map(type => {
    const info = EVENT_INFO[type];
    if (info.severity > state.day / 5) return 0.1; // Don't spawn severe events too early

    // Contextual boosts
    let weight = info.severity < 3 ? 2 : 1;

    // Rain after drought
    const hasDrought = state.events.some(e => e.type === EventType.Drought);
    if (type === EventType.Rain && hasDrought) weight *= 3;

    // Enemy raids when colony is large
    const livingAnts = state.ants.filter(a => a.state !== AntState.Dead).length;
    if (type === EventType.EnemyRaid && livingAnts > 20) weight *= 2;
    if (type === EventType.EnemyRaid && livingAnts > 40) weight *= 1.5;

    // Cold snap during heat wave and vice versa
    const hasHeatWave = state.events.some(e => e.type === EventType.HeatWave);
    if (type === EventType.ColdSnap && hasHeatWave) weight *= 2;

    // Flood during rain
    const hasRain = state.events.some(e => e.type === EventType.Rain);
    if (type === EventType.Flood && hasRain) weight *= 2.5;

    return weight;
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * totalWeight;
  let type = eventTypes[0];
  for (let i = 0; i < eventTypes.length; i++) {
    roll -= weights[i];
    if (roll <= 0) {
      type = eventTypes[i];
      break;
    }
  }

  const info = EVENT_INFO[type];

  const event: GameEvent = {
    type,
    timer: info.duration,
    maxTimer: info.duration,
    intensity: 0.3 + Math.random() * 0.7,
    announced: false,
  };

  if (type === EventType.Collapse || type === EventType.Earthquake) {
    const tunnels: { x: number; y: number }[] = [];
    for (const row of state.map) {
      for (const cell of row) {
        if (cell.terrain === TerrainType.Tunnel && cell.y > SURFACE_ROW) {
          tunnels.push({ x: cell.x, y: cell.y });
        }
      }
    }
    if (tunnels.length > 0) {
      const target = tunnels[Math.floor(Math.random() * tunnels.length)];
      event.affectedArea = { x: target.x, y: target.y, radius: type === EventType.Earthquake ? 4 : 2 };
    }
  }

  state.events.push(event);
  addNotification(state, `${info.name}: ${info.description}`, 'warning', 2);
}

function maybeSpawnSurfaceResources(state: GameState) {
  if (state.tick % 250 !== 0) return;
  if (state.surfaceDeposits.length >= 20) return;

  // Scarcity mechanic: regeneration slows as more deposits are depleted
  const depletedCount = state.surfaceDeposits.filter(d => d.depleted || d.amount < d.maxAmount * 0.3).length;
  const scarcityFactor = Math.max(0.1, 1 - depletedCount * 0.08); // Harder to find resources when many depleted
  if (Math.random() > 0.5 * scarcityFactor) return;

  const types = [ResourceType.Food, ResourceType.Protein, ResourceType.Sugar, ResourceType.Water, ResourceType.LeafFragments, ResourceType.Nectar];
  const type = types[Math.floor(Math.random() * types.length)];

  state.surfaceDeposits.push({
    id: genId(),
    x: 3 + Math.floor(Math.random() * (MAP_WIDTH - 6)),
    y: 4 + Math.floor(Math.random() * 4),
    type,
    amount: Math.floor((20 + Math.floor(Math.random() * 30)) * scarcityFactor),
    maxAmount: 50,
    surface: true,
    respawnRate: 0.3 + Math.random() * 1,
    depleted: false,
  });
}

function maybeSpawnEnemies(state: GameState) {
  // Spawn rate increases with colony size and day
  const spawnInterval = Math.max(150, 500 - state.day * 5 - state.ants.length * 2);
  if (state.tick % spawnInterval !== 0) return;
  // Enemy cap scales with colony size
  const maxEnemies = 8 + state.day + Math.floor(state.ants.filter(a => a.state !== AntState.Dead).length * 0.1);
  if (state.enemies.length >= maxEnemies) return;

  const prob = 0.3 + state.day * 0.01;
  if (Math.random() > prob) return;

  spawnEnemyAtEdge(state);
}

function spawnEnemyAtEdge(state: GameState) {
  const enemyTypes = Object.values(EnemyType);
  const weighted: EnemyType[] = [];
  for (const type of enemyTypes) {
    for (let i = 0; i < ENEMY_STATS[type].spawnWeight; i++) {
      weighted.push(type);
    }
  }

  // Stronger enemies appear later, and scale with colony size
  const livingAnts = state.ants.filter(a => a.state !== AntState.Dead).length;
  const colonyScale = Math.max(1, livingAnts / 15); // Scale factor based on colony size

  const availableTypes = weighted.filter(type => {
    const stats = ENEMY_STATS[type];
    return stats.maxHealth <= 30 + state.day * 5 + colonyScale * 10;
  });

  const type = availableTypes.length > 0
    ? availableTypes[Math.floor(Math.random() * availableTypes.length)]
    : EnemyType.RivalAnt;

  const side = Math.random() > 0.5;
  const x = side ? Math.floor(Math.random() * 8) : MAP_WIDTH - 1 - Math.floor(Math.random() * 8);
  const y = 3 + Math.floor(Math.random() * 5);

  const enemy = createEnemy(type, x, y);

  // Scale enemy stats with colony size for bigger challenge
  if (colonyScale > 1.5) {
    const scaleMul = 1 + (colonyScale - 1.5) * 0.15;
    enemy.maxHealth = Math.floor(enemy.maxHealth * scaleMul);
    enemy.health = enemy.maxHealth;
    enemy.attack = Math.floor(enemy.attack * (1 + (colonyScale - 1.5) * 0.1));
  }

  state.enemies.push(enemy);
}

// ============================================================
// ENVIRONMENTAL SYSTEMS
// ============================================================

function updateWaterLevels(state: GameState) {
  for (const row of state.map) {
    for (const cell of row) {
      if (cell.waterLevel > 0) {
        cell.waterLevel = Math.max(0, cell.waterLevel - 0.0003);
      }
    }
  }

  // Humidity chambers reduce nearby water
  for (const row of state.map) {
    for (const cell of row) {
      if (cell.chamberType === ChamberType.HumidityChamber) {
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            const nx = cell.x + dx;
            const ny = cell.y + dy;
            if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT) {
              state.map[ny][nx].waterLevel = Math.max(0, state.map[ny][nx].waterLevel - 0.001);
              state.map[ny][nx].humidity = Math.min(1, state.map[ny][nx].humidity + 0.0005);
            }
          }
        }
      }
    }
  }
}

function updateContamination(state: GameState) {
  for (const row of state.map) {
    for (const cell of row) {
      if (cell.contamination > 0) {
        cell.contamination = Math.max(0, cell.contamination - 0.0001);
      }
    }
  }

  // Waste chambers reduce contamination
  for (const row of state.map) {
    for (const cell of row) {
      if (cell.chamberType === ChamberType.WasteChamber) {
        for (let dy = -4; dy <= 4; dy++) {
          for (let dx = -4; dx <= 4; dx++) {
            const nx = cell.x + dx;
            const ny = cell.y + dy;
            if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT) {
              state.map[ny][nx].contamination = Math.max(0, state.map[ny][nx].contamination - 0.002);
            }
          }
        }
      }
    }
  }

  // Contamination damages ants
  for (const ant of state.ants) {
    if (ant.state === AntState.Dead) continue;
    const cell = state.map[Math.round(ant.y)]?.[Math.round(ant.x)];
    if (cell && cell.contamination > 0.5) {
      ant.health -= cell.contamination * 0.3;
    }
  }
}

function updateTemperature(state: GameState) {
  // Temperature slowly returns to baseline
  for (const row of state.map) {
    for (const cell of row) {
      const depth = cell.y - SURFACE_ROW;
      const baseline = depth < 0 ? 0.5 + state.ambientLight * 0.3 : Math.max(0.3, 0.7 - depth * 0.006);
      cell.temperature += (baseline - cell.temperature) * 0.001;
    }
  }

  // Humidity chambers stabilize temperature
  for (const row of state.map) {
    for (const cell of row) {
      if (cell.chamberType === ChamberType.HumidityChamber) {
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            const nx = cell.x + dx;
            const ny = cell.y + dy;
            if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT) {
              const c = state.map[ny][nx];
              c.temperature += (0.5 - c.temperature) * 0.005;
            }
          }
        }
      }
    }
  }
}

// ============================================================
// COLONY MIND
// ============================================================

function updateColonyMind(state: GameState) {
  // Charge based on colony health
  const aliveAnts = state.ants.filter(a => a.state !== AntState.Dead).length;
  const hunger = state.ants.reduce((sum, a) => sum + a.hunger, 0) / Math.max(1, aliveAnts);
  const morale = Math.max(0, 1 - hunger) * (state.enemies.length === 0 ? 1 : 0.5);

  state.colonyMind.chargeRate = 0.01 + morale * 0.03 + aliveAnts * 0.001;
  state.colonyMind.consciousness = Math.min(
    state.colonyMind.maxConsciousness,
    state.colonyMind.consciousness + state.colonyMind.chargeRate
  );

  // Update abilities
  for (const ability of state.colonyMind.abilities) {
    if (ability.currentCooldown > 0) {
      ability.currentCooldown--;
    }

    if (ability.active) {
      ability.remainingDuration--;
      if (ability.remainingDuration <= 0) {
        ability.active = false;
      }
    }
  }
}

// ============================================================
// GAME PHASE & SCORE
// ============================================================

function updateGamePhase(state: GameState) {
  const aliveAnts = state.ants.filter(a => a.state !== AntState.Dead).length;
  const phases = [GamePhase.Empire, GamePhase.Dominance, GamePhase.Expansion, GamePhase.Survival];

  for (const phase of phases) {
    const threshold = PHASE_THRESHOLDS[phase];
    if (aliveAnts >= threshold.minAnts && state.day >= threshold.minDay) {
      if (state.gamePhase !== phase) {
        state.gamePhase = phase;
        addNotification(state, `Colony entered ${phase} phase!`, 'success', 5);
      }
      return;
    }
  }
}

function updateColonyScore(state: GameState) {
  const aliveAnts = state.ants.filter(a => a.state !== AntState.Dead).length;
  const chambers = state.map.flat().filter(c => c.chamberType).length;

  state.colonyScore =
    aliveAnts * SCORE_VALUES.perAnt +
    state.day * SCORE_VALUES.perDay +
    chambers * SCORE_VALUES.perChamber +
    (state.queenAlive ? SCORE_VALUES.queenAliveBonus : 0);
}

// ============================================================
// PUBLIC API - Actions
// ============================================================

export function excavateArea(state: GameState, x: number, y: number): GameState {
  const newState = { ...state };
  newState.map = state.map.map(row => row.map(cell => ({ ...cell })));
  newState.resources = { ...state.resources };

  // Excavate in a small radius for better UX
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      excavateCell(newState, x + dx, y + dy);
    }
  }

  return newState;
}

export function buildChamber(state: GameState, x: number, y: number, type: ChamberType): GameState {
  const info = CHAMBER_INFO[type];
  if (state.resources.compactEarth < info.cost.compactEarth || state.resources.biomass < info.cost.biomass) {
    return state;
  }

  const newState = { ...state };
  newState.map = state.map.map(row => row.map(cell => ({ ...cell })));
  newState.resources = { ...state.resources };

  // Check if area is clear (tunnel)
  const centerCell = newState.map[y]?.[x];
  if (!centerCell || (centerCell.terrain !== TerrainType.Tunnel && centerCell.terrain !== TerrainType.Chamber)) {
    return state;
  }

  // Carve chamber
  const radius = info.size;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= radius * radius + 1) {
        const ny = y + dy;
        const nx = x + dx;
        if (ny >= SURFACE_ROW && ny < MAP_HEIGHT && nx >= 0 && nx < MAP_WIDTH) {
          const cell = newState.map[ny][nx];
          if (cell.terrain === TerrainType.Tunnel || cell.terrain === TerrainType.Dirt || cell.terrain === TerrainType.HardDirt) {
            cell.terrain = TerrainType.Chamber;
            cell.chamberType = type;
            cell.hardness = 0;
            cell.excavatable = false;
            cell.tunnelQuality = 1;
            cell.explored = true;
            cell.lightLevel = Math.max(cell.lightLevel, FOG_SETTINGS.chamberLight);
          }
        }
      }
    }
  }

  newState.resources.compactEarth -= info.cost.compactEarth;
  newState.resources.biomass -= info.cost.biomass;

  addNotification(newState, `${info.name} constructed!`, 'success', 3);

  return newState;
}

export function markPheromone(state: GameState, x: number, y: number, type: PheromoneType): GameState {
  const newState = { ...state };
  newState.pheromoneMap = new Map(state.pheromoneMap);
  newState.resources = { ...state.resources };

  // Mark in a small area
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      addPheromone(newState, x + dx, y + dy, type, PHEROMONE_SETTINGS.playerMarkStrength);
    }
  }

  return newState;
}

export function activateMindAbility(state: GameState, abilityType: MindAbilityType): GameState {
  const ability = state.colonyMind.abilities.find(a => a.type === abilityType);
  if (!ability) return state;
  if (state.colonyMind.consciousness < ability.cost) return state;
  if (ability.currentCooldown > 0) return state;
  if (ability.active) return state;

  const newState = { ...state };
  newState.colonyMind = { ...state.colonyMind, abilities: state.colonyMind.abilities.map(a => ({ ...a })) };

  const newAbility = newState.colonyMind.abilities.find(a => a.type === abilityType)!;
  newAbility.active = true;
  newAbility.remainingDuration = newAbility.duration;
  newState.colonyMind.consciousness -= newAbility.cost;

  // Apply immediate effects
  switch (abilityType) {
    case MindAbilityType.TotalAlarm: {
      // All soldiers head to entrances
      for (const ant of newState.ants) {
        if (ant.caste === AntCaste.Soldier && ant.state !== AntState.Dead) {
          const entrance = findEntrance(newState);
          if (entrance) {
            ant.targetX = entrance.x;
            ant.targetY = entrance.y;
            ant.state = AntState.Fighting;
          }
        }
      }
      addNotification(newState, 'Total Alarm! All soldiers to the entrances!', 'warning', 5);
      break;
    }
    case MindAbilityType.WorkSurge: {
      for (const ant of newState.ants) {
        if (ant.caste === AntCaste.Worker && ant.state !== AntState.Dead) {
          ant.speed = ANT_STATS[AntCaste.Worker].speed * 1.5;
        }
      }
      break;
    }
    default:
      break;
  }

  addNotification(newState, `${MIND_ABILITIES[abilityType].name} activated!`, 'success', 3);

  return newState;
}

export function setGameSpeed(state: GameState, speed: number): GameState {
  return { ...state, speed: Math.max(1, Math.min(3, speed)) };
}

export function togglePause(state: GameState): GameState {
  return { ...state, paused: !state.paused };
}
