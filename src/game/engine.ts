// ============================================================
// FerroNest - Game Engine (Core Simulation)
// ============================================================

import { GameState, Cell, TerrainType, AntCaste, AntState, ChamberType, ResourceType, PheromoneType, GamePhase, GameTool, GameNotification, Brood, BroodStage, Ant, Enemy, EnemyType, GameEvent, EventType, ColonyMind, MindAbility, MindAbilityType, ResourceDeposit } from './types';
import { MAP_WIDTH, MAP_HEIGHT, SURFACE_ROW, TICKS_PER_DAY, ANT_STATS, CHAMBER_INFO, PHEROMONE_SETTINGS, BROOD_TIMING, ENEMY_STATS, EVENT_INFO, MIND_ABILITIES } from './constants';

let nextId = 0;
function genId(): string {
  return `e${nextId++}`;
}

// --- Create Initial Map ---
function createMap(): Cell[][] {
  const map: Cell[][] = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      const cell: Cell = {
        x,
        y,
        terrain: TerrainType.Dirt,
        hardness: 0.5,
        humidity: 0,
        temperature: 0.5,
        contamination: 0,
        waterLevel: 0,
        excavatable: true,
      };

      if (y < 3) {
        cell.terrain = TerrainType.Sky;
        cell.excavatable = false;
        cell.hardness = 1;
      } else if (y < SURFACE_ROW) {
        // Surface layer
        if (y === 3) {
          cell.terrain = TerrainType.SurfaceGrass;
          cell.excavatable = false;
          cell.hardness = 0.8;
        } else {
          cell.terrain = TerrainType.SurfaceDirt;
          cell.hardness = 0.3;
        }
      } else {
        // Underground layers get harder with depth
        const depth = y - SURFACE_ROW;
        if (depth > 40) {
          cell.terrain = TerrainType.Stone;
          cell.hardness = 0.95;
          cell.excavatable = false;
        } else if (depth > 30) {
          cell.terrain = TerrainType.HardDirt;
          cell.hardness = 0.8;
        } else if (depth > 15) {
          cell.terrain = TerrainType.Dirt;
          cell.hardness = 0.6;
        } else {
          cell.terrain = TerrainType.Dirt;
          cell.hardness = 0.4;
        }

        // Add some roots
        if (depth < 20 && Math.random() < 0.03) {
          cell.terrain = TerrainType.Roots;
          cell.hardness = 0.7;
        }

        // Humidity increases with depth
        cell.humidity = Math.min(1, 0.2 + depth * 0.015);
        // Temperature stabilizes with depth
        cell.temperature = Math.max(0.3, 0.7 - depth * 0.008);
      }

      row.push(cell);
    }
    map.push(row);
  }
  return map;
}

// --- Create Initial Queen Chamber ---
function createInitialChamber(map: Cell[][]): { cx: number; cy: number } {
  const cx = Math.floor(MAP_WIDTH / 2);
  const cy = SURFACE_ROW + 4;
  const radius = 2;

  // Clear the entrance tunnel
  for (let y = SURFACE_ROW; y <= cy + radius; y++) {
    map[y][cx].terrain = TerrainType.Tunnel;
    map[y][cx].hardness = 0;
    map[y][cx].excavatable = false;
  }

  // Clear the chamber
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
          map[ny][nx].humidity = 0.6;
          map[ny][nx].temperature = 0.6;
        }
      }
    }
  }

  return { cx, cy };
}

// --- Create Ant ---
function createAnt(caste: AntCaste, x: number, y: number): Ant {
  const stats = ANT_STATS[caste];
  return {
    id: genId(),
    caste,
    state: AntState.Idle,
    x,
    y,
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
  };
}

// --- Create Enemy ---
function createEnemy(type: EnemyType, x: number, y: number): Enemy {
  const stats = ENEMY_STATS[type];
  return {
    id: genId(),
    type,
    x,
    y,
    targetX: x,
    targetY: y,
    health: stats.maxHealth,
    maxHealth: stats.maxHealth,
    attack: stats.attack,
    speed: stats.speed,
    path: [],
    pathIndex: 0,
    stateTimer: 0,
  };
}

// --- Create Colony Mind ---
function createColonyMind(): ColonyMind {
  return {
    consciousness: 50,
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

// --- Initialize Game State ---
export function createInitialState(): GameState {
  const map = createMap();
  const { cx, cy } = createInitialChamber(map);

  // Create queen
  const queen = createAnt(AntCaste.Queen, cx, cy);

  // Create 5 initial workers
  const workers: Ant[] = [];
  for (let i = 0; i < 5; i++) {
    const wx = cx + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 2);
    const wy = cy + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 2);
    workers.push(createAnt(AntCaste.Worker, Math.max(0, Math.min(MAP_WIDTH - 1, wx)), Math.max(SURFACE_ROW, Math.min(MAP_HEIGHT - 1, wy))));
  }

  // Create initial surface food deposits
  const surfaceDeposits = [];
  for (let i = 0; i < 8; i++) {
    const dx = 5 + Math.floor(Math.random() * (MAP_WIDTH - 10));
    const dy = 4 + Math.floor(Math.random() * 3);
    const types = [ResourceType.Food, ResourceType.Protein, ResourceType.Sugar];
    const type = types[Math.floor(Math.random() * types.length)];
    surfaceDeposits.push({
      id: genId(),
      x: dx,
      y: dy,
      type,
      amount: 20 + Math.floor(Math.random() * 30),
      maxAmount: 50,
      surface: true,
    });
  }

  return {
    running: true,
    paused: false,
    tick: 0,
    day: 1,
    dayProgress: 0,
    speed: 1,
    map,
    ants: [queen, ...workers],
    enemies: [],
    resources: {
      food: 30,
      protein: 10,
      sugar: 15,
      fungus: 0,
      water: 20,
      pheromones: 50,
      biomass: 0,
      compactEarth: 5,
    },
    surfaceDeposits,
    pheromoneMap: new Map(),
    events: [],
    colonyMind: createColonyMind(),
    totalAntsHatched: 6,
    totalAntsLost: 0,
    queenAlive: true,
    gamePhase: GamePhase.Survival,
    selectedTool: GameTool.Excavate,
    selectedChamberType: ChamberType.BroodChamber,
    selectedPheromoneType: PheromoneType.Collect,
    showPheromoneView: false,
    cameraX: cx * 12 - 400,
    cameraY: (cy - 5) * 12 - 200,
    zoom: 1,
    notifications: [],
    brood: [],
  };
}

// --- Pheromone Map Helpers ---
function pheromoneKey(x: number, y: number): string {
  return `${x},${y}`;
}

// --- Pathfinding (Simple BFS) ---
function findPath(map: Cell[][], sx: number, sy: number, tx: number, ty: number): { x: number; y: number }[] {
  if (sx === tx && sy === ty) return [];

  const walkable = (x: number, y: number) => {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return false;
    const t = map[y][x].terrain;
    return t === TerrainType.Tunnel || t === TerrainType.Chamber || t === TerrainType.SurfaceDirt || t === TerrainType.SurfaceGrass;
  };

  if (!walkable(tx, ty)) return [];

  const visited = new Set<string>();
  const queue: { x: number; y: number; path: { x: number; y: number }[] }[] = [{ x: sx, y: sy, path: [] }];
  visited.add(`${sx},${sy}`);

  const dirs = [
    { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
    { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
    { dx: -1, dy: -1 }, { dx: 1, dy: -1 },
    { dx: -1, dy: 1 }, { dx: 1, dy: 1 },
  ];

  let iterations = 0;
  const maxIterations = 2000;

  while (queue.length > 0 && iterations < maxIterations) {
    iterations++;
    const current = queue.shift()!;

    for (const { dx, dy } of dirs) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      const key = `${nx},${ny}`;

      if (visited.has(key)) continue;
      if (!walkable(nx, ny)) continue;

      const newPath = [...current.path, { x: nx, y: ny }];
      if (nx === tx && ny === ty) return newPath;

      visited.add(key);
      queue.push({ x: nx, y: ny, path: newPath });
    }
  }

  return []; // No path found
}

// --- Find nearest walkable cell ---
function findNearestWalkable(map: Cell[][], x: number, y: number): { x: number; y: number } | null {
  const walkable = (cx: number, cy: number) => {
    if (cx < 0 || cx >= MAP_WIDTH || cy < 0 || cy >= MAP_HEIGHT) return false;
    const t = map[cy][cx].terrain;
    return t === TerrainType.Tunnel || t === TerrainType.Chamber || t === TerrainType.SurfaceDirt || t === TerrainType.SurfaceGrass;
  };

  if (walkable(x, y)) return { x, y };

  for (let r = 1; r < 10; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (walkable(x + dx, y + dy)) return { x: x + dx, y: y + dy };
      }
    }
  }
  return null;
}

// --- Game Tick ---
export function gameTick(state: GameState): GameState {
  if (!state.running || state.paused) return state;

  const newState = { ...state };
  newState.tick++;
  newState.dayProgress = (newState.tick % TICKS_PER_DAY) / TICKS_PER_DAY;

  if (newState.tick % TICKS_PER_DAY === 0) {
    newState.day++;
  }

  // Deep clone arrays we'll modify
  newState.ants = state.ants.map(a => ({ ...a }));
  newState.enemies = state.enemies.map(e => ({ ...e }));
  newState.events = state.events.map(e => ({ ...e }));
  newState.brood = (state.brood || []).map(b => ({ ...b }));
  newState.surfaceDeposits = state.surfaceDeposits.map(d => ({ ...d }));
  newState.map = state.map.map(row => row.map(cell => ({ ...cell })));
  newState.pheromoneMap = new Map(state.pheromoneMap);
  newState.resources = { ...state.resources };
  newState.colonyMind = { ...state.colonyMind, abilities: state.colonyMind.abilities.map(a => ({ ...a })) };
  newState.notifications = [...state.notifications];

  // --- Systems ---

  // 1. Consume food
  consumeResources(newState);

  // 2. Update brood
  updateBrood(newState);

  // 3. Queen lays eggs
  queenLayEggs(newState);

  // 4. Update ant AI
  updateAnts(newState);

  // 5. Update enemies
  updateEnemies(newState);

  // 6. Combat
  processCombat(newState);

  // 7. Decay pheromones
  decayPheromones(newState);

  // 8. Update events
  updateEvents(newState);

  // 9. Random events
  maybeSpawnEvent(newState);

  // 10. Spawn surface resources
  maybeSpawnSurfaceResources(newState);

  // 11. Maybe spawn enemies
  maybeSpawnEnemies(newState);

  // 12. Update water levels
  updateWaterLevels(newState);

  // 13. Update contamination
  updateContamination(newState);

  // 14. Update colony mind
  updateColonyMind(newState);

  // 15. Check game phase
  updateGamePhase(newState);

  // 16. Remove dead ants/enemies
  newState.ants = newState.ants.filter(a => a.state !== AntState.Dead);
  newState.enemies = newState.enemies.filter(e => e.health > 0);

  // 17. Check queen alive
  newState.queenAlive = newState.ants.some(a => a.caste === AntCaste.Queen);

  // 18. Clean old notifications
  newState.notifications = newState.notifications.filter(n => newState.tick - n.tick < 300);

  return newState;
}

// --- Resource Consumption ---
function consumeResources(state: GameState) {
  let totalFoodConsumption = 0;
  let totalProteinConsumption = 0;

  for (const ant of state.ants) {
    if (ant.state === AntState.Dead) continue;
    const stats = ANT_STATS[ant.caste];
    totalFoodConsumption += stats.foodConsumption;
    totalProteinConsumption += stats.proteinConsumption;

    // Hunger increases
    ant.hunger = Math.min(1, ant.hunger + stats.foodConsumption * 0.001);

    // Starving ants take damage
    if (ant.hunger > 0.8) {
      ant.health -= 0.5;
      if (ant.health <= 0) {
        ant.state = AntState.Dead;
        state.totalAntsLost++;
      }
    }
  }

  // Consume from stores
  const foodNeeded = totalFoodConsumption * 0.01;
  const proteinNeeded = totalProteinConsumption * 0.01;

  if (state.resources.food > 0) {
    const consumed = Math.min(state.resources.food, foodNeeded);
    state.resources.food -= consumed;
    // Feeding reduces hunger
    for (const ant of state.ants) {
      if (ant.state !== AntState.Dead && consumed > 0) {
        ant.hunger = Math.max(0, ant.hunger - consumed * 0.1);
      }
    }
  }

  if (state.resources.protein > 0) {
    state.resources.protein = Math.max(0, state.resources.protein - proteinNeeded);
  }
}

// --- Brood Updates ---
function updateBrood(state: GameState) {
  const newAnts: Ant[] = [];

  for (const brood of state.brood) {
    // Larvae need food
    if (brood.stage === BroodStage.Larva) {
      if (state.resources.food > BROOD_TIMING.foodPerLarvaPerTick) {
        state.resources.food -= BROOD_TIMING.foodPerLarvaPerTick;
        brood.progress += 1 / BROOD_TIMING.larvaToPupa;
        brood.needsFood = false;
      } else {
        brood.needsFood = true;
        brood.health -= 0.5;
      }
    } else if (brood.stage === BroodStage.Egg) {
      brood.progress += 1 / BROOD_TIMING.eggToLarva;
    } else if (brood.stage === BroodStage.Pupa) {
      brood.progress += 1 / BROOD_TIMING.pupaToHatch;
    }

    // Check for advancement
    if (brood.progress >= 1) {
      if (brood.stage === BroodStage.Egg) {
        brood.stage = BroodStage.Larva;
        brood.progress = 0;
      } else if (brood.stage === BroodStage.Larva) {
        brood.stage = BroodStage.Pupa;
        brood.progress = 0;
      } else if (brood.stage === BroodStage.Pupa) {
        // Hatch!
        const pos = findNearestWalkable(state.map, brood.x, brood.y);
        if (pos) {
          newAnts.push(createAnt(brood.caste, pos.x, pos.y));
          state.totalAntsHatched++;
          addNotification(state, `A new ${brood.caste} has hatched!`, 'success');
        }
        brood.health = 0; // Mark for removal
      }
    }

    // Dead brood
    if (brood.health <= 0) {
      // Will be filtered out
    }

    // Bad conditions kill brood
    const cell = state.map[brood.y]?.[brood.x];
    if (cell) {
      if (cell.waterLevel > 0.5) brood.health -= 2;
      if (cell.contamination > 0.5) brood.health -= 1;
      if (cell.temperature < 0.2 || cell.temperature > 0.9) brood.health -= 0.5;
    }
  }

  // Remove dead brood
  state.brood = state.brood.filter(b => b.health > 0);

  // Add new ants
  state.ants.push(...newAnts);
}

// --- Queen Lays Eggs ---
function queenLayEggs(state: GameState) {
  const queen = state.ants.find(a => a.caste === AntCaste.Queen && a.state !== AntState.Dead);
  if (!queen) return;

  // Queen lays eggs every ~100 ticks if food is available
  if (state.tick % 100 !== 0) return;
  if (state.resources.food < 5) return;

  // Find a brood chamber
  let broodX = queen.x;
  let broodY = queen.y;
  for (const row of state.map) {
    for (const cell of row) {
      if (cell.chamberType === ChamberType.BroodChamber) {
        broodX = cell.x;
        broodY = cell.y;
      }
    }
  }

  // Decide caste based on colony needs
  let caste = AntCaste.Worker;
  const soldierCount = state.ants.filter(a => a.caste === AntCaste.Soldier && a.state !== AntState.Dead).length;
  const workerCount = state.ants.filter(a => a.caste === AntCaste.Worker && a.state !== AntState.Dead).length;
  const scoutCount = state.ants.filter(a => a.caste === AntCaste.Scout && a.state !== AntState.Dead).length;
  const nurseCount = state.ants.filter(a => a.caste === AntCaste.Nurse && a.state !== AntState.Dead).length;
  const totalCount = state.ants.filter(a => a.state !== AntState.Dead).length;

  if (state.enemies.length > 0 && soldierCount < 3 && state.resources.protein >= 5) {
    caste = AntCaste.Soldier;
    state.resources.protein -= 2;
  } else if (scoutCount < 1) {
    caste = AntCaste.Scout;
  } else if (nurseCount < 1 && (state.brood?.length || 0) > 3) {
    caste = AntCaste.Nurse;
  } else if (workerCount < totalCount * 0.6) {
    caste = AntCaste.Worker;
  } else if (soldierCount < 2 && state.resources.protein >= 3) {
    caste = AntCaste.Soldier;
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
  });
}

// --- Ant AI ---
function updateAnts(state: GameState) {
  for (const ant of state.ants) {
    if (ant.state === AntState.Dead) continue;

    ant.age++;

    // Die of old age
    if (ant.age >= ant.maxAge) {
      ant.state = AntState.Dead;
      state.totalAntsLost++;
      continue;
    }

    // Process based on caste
    switch (ant.caste) {
      case AntCaste.Queen:
        updateQueen(state, ant);
        break;
      case AntCaste.Worker:
        updateWorker(state, ant);
        break;
      case AntCaste.Scout:
        updateScout(state, ant);
        break;
      case AntCaste.Soldier:
        updateSoldier(state, ant);
        break;
      case AntCaste.Nurse:
        updateNurse(state, ant);
        break;
      case AntCaste.Builder:
        updateBuilder(state, ant);
        break;
      case AntCaste.Cultivator:
        updateCultivator(state, ant);
        break;
    }

    // Move along path
    moveAlongPath(state, ant);
  }
}

function moveAlongPath(state: GameState, ant: Ant) {
  if (ant.path.length > 0 && ant.pathIndex < ant.path.length) {
    const target = ant.path[ant.pathIndex];
    const dx = target.x - ant.x;
    const dy = target.y - ant.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < ant.speed) {
      ant.x = target.x;
      ant.y = target.y;
      ant.pathIndex++;
    } else {
      ant.x += (dx / dist) * ant.speed;
      ant.y += (dy / dist) * ant.speed;
    }

    ant.state = AntState.Moving;
  } else if (ant.state === AntState.Moving) {
    ant.state = AntState.Idle;
    ant.path = [];
    ant.pathIndex = 0;
  }
}

function assignPath(state: GameState, ant: Ant, tx: number, ty: number): boolean {
  const startX = Math.round(ant.x);
  const startY = Math.round(ant.y);
  const targetX = Math.round(tx);
  const targetY = Math.round(ty);
  const path = findPath(state.map, startX, startY, targetX, targetY);
  if (path.length > 0) {
    ant.path = path;
    ant.pathIndex = 0;
    ant.targetX = tx;
    ant.targetY = ty;
    return true;
  }
  return false;
}

function updateQueen(state: GameState, ant: Ant) {
  // Queen stays near queen chamber, doesn't move much
  if (ant.state === AntState.Idle) {
    // Stay in the queen chamber area
    const chamber = findChamber(state, ChamberType.QueenChamber);
    if (chamber) {
      const dx = chamber.x - ant.x;
      const dy = chamber.y - ant.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        assignPath(state, ant, chamber.x, chamber.y);
      }
    }
  }
}

function updateWorker(state: GameState, ant: Ant) {
  if (ant.state === AntState.Idle || ant.stateTimer <= 0) {
    ant.stateTimer = 30 + Math.floor(Math.random() * 30);

    // Check for pheromone directives
    const pheromoneDir = getStrongestPheromone(state, Math.round(ant.x), Math.round(ant.y));

    if (ant.carrying !== null) {
      // Carrying resource - bring to storage
      const storage = findChamber(state, ChamberType.FoodStorage);
      if (storage) {
        const dist = Math.abs(ant.x - storage.x) + Math.abs(ant.y - storage.y);
        if (dist < 3) {
          // Deposit
          state.resources[ant.carrying as keyof typeof state.resources] += ant.carryAmount;
          ant.carrying = null;
          ant.carryAmount = 0;
          ant.state = AntState.Idle;
        } else {
          assignPath(state, ant, storage.x, storage.y);
          ant.state = AntState.Carrying;
        }
      }
    } else if (pheromoneDir === PheromoneType.Collect || (!pheromoneDir && Math.random() < 0.5)) {
      // Collect food
      const deposit = findNearestSurfaceDeposit(state, ant);
      if (deposit) {
        const dist = Math.abs(ant.x - deposit.x) + Math.abs(ant.y - deposit.y);
        if (dist < 2) {
          // Pick up
          const amount = Math.min(ant.carryCapacity, deposit.amount);
          ant.carrying = deposit.type;
          ant.carryAmount = amount;
          deposit.amount -= amount;
          ant.state = AntState.Carrying;

          // Mark pheromone trail
          addPheromone(state, Math.round(ant.x), Math.round(ant.y), PheromoneType.Collect, 0.5);
        } else {
          assignPath(state, ant, deposit.x, deposit.y);
          ant.state = AntState.Moving;
        }
      } else {
        // Wander
        wanderAnt(state, ant);
      }
    } else if (pheromoneDir === PheromoneType.Excavate) {
      // Excavate nearby
      const digTarget = findExcavatableNeighbor(state, Math.round(ant.x), Math.round(ant.y));
      if (digTarget) {
        excavateCell(state, digTarget.x, digTarget.y);
        ant.state = AntState.Excavating;
        ant.stateTimer = 20;
        state.resources.compactEarth += 0.1;
      }
    } else if (pheromoneDir === PheromoneType.Evacuate) {
      // Move eggs/queen to safety
      wanderAnt(state, ant);
    } else {
      // Default: collect food or wander
      const deposit = findNearestSurfaceDeposit(state, ant);
      if (deposit) {
        assignPath(state, ant, deposit.x, deposit.y);
        ant.state = AntState.Moving;
      } else {
        wanderAnt(state, ant);
      }
    }
  }

  ant.stateTimer--;
}

function updateScout(state: GameState, ant: Ant) {
  if (ant.state === AntState.Idle || ant.stateTimer <= 0) {
    ant.stateTimer = 50 + Math.floor(Math.random() * 50);

    // Scouts go to surface to find resources
    const surfaceY = 4 + Math.floor(Math.random() * 3);
    const surfaceX = Math.floor(Math.random() * MAP_WIDTH);

    if (assignPath(state, ant, surfaceX, surfaceY)) {
      ant.state = AntState.Exploring;
    } else {
      wanderAnt(state, ant);
    }
  }

  // If on surface and near a deposit, mark it with pheromone
  if (ant.y < SURFACE_ROW) {
    for (const deposit of state.surfaceDeposits) {
      const dist = Math.abs(ant.x - deposit.x) + Math.abs(ant.y - deposit.y);
      if (dist < 5 && deposit.amount > 0) {
        addPheromone(state, Math.round(ant.x), Math.round(ant.y), PheromoneType.Collect, 0.8);
      }
    }
  }

  ant.stateTimer--;
}

function updateSoldier(state: GameState, ant: Ant) {
  if (ant.state === AntState.Idle || ant.stateTimer <= 0) {
    ant.stateTimer = 30 + Math.floor(Math.random() * 20);

    // Check for defend pheromone
    const pheromoneDir = getStrongestPheromone(state, Math.round(ant.x), Math.round(ant.y));

    // Find nearest enemy
    const nearestEnemy = findNearestEnemy(state, ant);

    if (nearestEnemy) {
      assignPath(state, ant, nearestEnemy.x, nearestEnemy.y);
      ant.state = AntState.Fighting;
    } else if (pheromoneDir === PheromoneType.Defend) {
      // Move to entrance
      const entrance = findEntrance(state);
      if (entrance) {
        assignPath(state, ant, entrance.x, entrance.y);
      }
    } else {
      // Patrol near entrances
      const entrance = findEntrance(state);
      if (entrance) {
        const patrolX = entrance.x + (Math.random() - 0.5) * 6;
        const patrolY = entrance.y + Math.random() * 3;
        assignPath(state, ant, Math.round(patrolX), Math.round(patrolY));
      } else {
        wanderAnt(state, ant);
      }
    }
  }

  ant.stateTimer--;
}

function updateNurse(state: GameState, ant: Ant) {
  if (ant.state === AntState.Idle || ant.stateTimer <= 0) {
    ant.stateTimer = 20 + Math.floor(Math.random() * 20);

    // Find brood that needs care
    const needyBrood = state.brood.find(b => b.needsFood || b.health < 50);
    if (needyBrood) {
      if (state.resources.food > 0.5) {
        state.resources.food -= 0.1;
        needyBrood.health = Math.min(100, needyBrood.health + 5);
        needyBrood.needsFood = false;
        // Boost progress
        needyBrood.progress += 0.01;
      }
      assignPath(state, ant, needyBrood.x, needyBrood.y);
      ant.state = AntState.Nursing;
    } else {
      // Wander near brood chambers
      const broodChamber = findChamber(state, ChamberType.BroodChamber);
      if (broodChamber) {
        const wx = broodChamber.x + (Math.random() - 0.5) * 4;
        const wy = broodChamber.y + (Math.random() - 0.5) * 4;
        assignPath(state, ant, Math.round(wx), Math.round(wy));
      } else {
        wanderAnt(state, ant);
      }
    }
  }

  ant.stateTimer--;
}

function updateBuilder(state: GameState, ant: Ant) {
  if (ant.state === AntState.Idle || ant.stateTimer <= 0) {
    ant.stateTimer = 30 + Math.floor(Math.random() * 30);

    const pheromoneDir = getStrongestPheromone(state, Math.round(ant.x), Math.round(ant.y));

    if (pheromoneDir === PheromoneType.Excavate) {
      // Excavate more efficiently
      const digTarget = findExcavatableNeighbor(state, Math.round(ant.x), Math.round(ant.y));
      if (digTarget) {
        excavateCell(state, digTarget.x, digTarget.y);
        excavateCell(state, digTarget.x, digTarget.y); // Double speed
        ant.state = AntState.Excavating;
        ant.stateTimer = 15;
        state.resources.compactEarth += 0.2;
      }
    } else {
      wanderAnt(state, ant);
    }
  }

  ant.stateTimer--;
}

function updateCultivator(state: GameState, ant: Ant) {
  if (ant.state === AntState.Idle || ant.stateTimer <= 0) {
    ant.stateTimer = 40 + Math.floor(Math.random() * 20);

    // Grow fungus in fungus chambers
    const fungusChamber = findChamber(state, ChamberType.FungusChamber);
    if (fungusChamber) {
      const dist = Math.abs(ant.x - fungusChamber.x) + Math.abs(ant.y - fungusChamber.y);
      if (dist < 3) {
        state.resources.fungus += 0.2;
        ant.state = AntState.Building;
      } else {
        assignPath(state, ant, fungusChamber.x, fungusChamber.y);
      }
    } else {
      wanderAnt(state, ant);
    }
  }

  ant.stateTimer--;
}

// --- Helper Functions ---
function wanderAnt(state: GameState, ant: Ant) {
  const range = 5;
  const wx = Math.round(ant.x + (Math.random() - 0.5) * range);
  const wy = Math.round(ant.y + (Math.random() - 0.5) * range);
  const clampedX = Math.max(0, Math.min(MAP_WIDTH - 1, wx));
  const clampedY = Math.max(SURFACE_ROW - 3, Math.min(MAP_HEIGHT - 1, wy));

  if (assignPath(state, ant, clampedX, clampedY)) {
    ant.state = AntState.Moving;
  }
}

function findChamber(state: GameState, type: ChamberType): { x: number; y: number } | null {
  for (const row of state.map) {
    for (const cell of row) {
      if (cell.chamberType === type) return { x: cell.x, y: cell.y };
    }
  }
  return null;
}

function findEntrance(state: GameState): { x: number; y: number } | null {
  // Find where tunnels meet the surface
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
    if (deposit.amount <= 0) continue;
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

  for (const enemy of state.enemies) {
    const dist = Math.abs(ant.x - enemy.x) + Math.abs(ant.y - enemy.y);
    if (dist < minDist && dist < 20) {
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
  ];

  for (const { dx, dy } of dirs) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT) {
      const cell = state.map[ny][nx];
      if (cell.excavatable && (cell.terrain === TerrainType.Dirt || cell.terrain === TerrainType.HardDirt || cell.terrain === TerrainType.SurfaceDirt)) {
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
  if (cell.terrain !== TerrainType.Dirt && cell.terrain !== TerrainType.HardDirt && cell.terrain !== TerrainType.SurfaceDirt) return;

  cell.hardness -= 0.1;
  if (cell.hardness <= 0) {
    cell.terrain = TerrainType.Tunnel;
    cell.hardness = 0;
    cell.excavatable = false;
  }
}

function addPheromone(state: GameState, x: number, y: number, type: PheromoneType, strength: number) {
  if (state.resources.pheromones <= 0) return;
  const key = pheromoneKey(x, y);
  const existing = state.pheromoneMap.get(key);
  if (existing && existing.strength >= strength) return;

  state.pheromoneMap.set(key, { type, strength, x, y });
  state.resources.pheromones = Math.max(0, state.resources.pheromones - 0.05);
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
        bestStrength = p.strength;
        best = p.type;
      }
    }
  }

  return best;
}

// --- Enemy AI ---
function updateEnemies(state: GameState) {
  for (const enemy of state.enemies) {
    if (enemy.health <= 0) continue;

    if (enemy.stateTimer <= 0) {
      enemy.stateTimer = 20 + Math.floor(Math.random() * 30);

      // Enemies try to move towards colony
      const entrance = findEntrance(state);
      if (entrance) {
        // Move toward entrance with some randomness
        const tx = entrance.x + Math.floor((Math.random() - 0.5) * 5);
        const ty = entrance.y + Math.floor((Math.random() - 0.5) * 3);
        enemy.targetX = tx;
        enemy.targetY = ty;
      }
    }

    // Move toward target
    const dx = enemy.targetX - enemy.x;
    const dy = enemy.targetY - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 1) {
      enemy.x += (dx / dist) * enemy.speed;
      enemy.y += (dy / dist) * enemy.speed;
    }

    enemy.stateTimer--;
  }
}

// --- Combat ---
function processCombat(state: GameState) {
  for (const ant of state.ants) {
    if (ant.state === AntState.Dead) continue;

    for (const enemy of state.enemies) {
      if (enemy.health <= 0) continue;

      const dist = Math.sqrt((ant.x - enemy.x) ** 2 + (ant.y - enemy.y) ** 2);

      if (dist < 1.5) {
        // Ant attacks enemy
        enemy.health -= ant.attack * 0.1;

        // Enemy attacks ant
        ant.health -= enemy.attack * 0.05;

        if (ant.health <= 0) {
          ant.state = AntState.Dead;
          state.totalAntsLost++;
          addNotification(state, `A ${ant.caste} was killed by ${ENEMY_STATS[enemy.type].name}!`, 'danger');
        }

        ant.state = AntState.Fighting;

        // Release alarm pheromone
        addPheromone(state, Math.round(ant.x), Math.round(ant.y), PheromoneType.Defend, 0.7);

        if (enemy.health <= 0) {
          // Enemy drops resources
          state.resources.protein += 5;
          state.resources.biomass += 2;
          addNotification(state, `${ENEMY_STATS[enemy.type].name} defeated!`, 'success');
        }
      }
    }
  }
}

// --- Pheromone Decay ---
function decayPheromones(state: GameState) {
  const toRemove: string[] = [];

  state.pheromoneMap.forEach((p, key) => {
    p.strength -= PHEROMONE_SETTINGS.decayRate;
    if (p.strength <= 0) {
      toRemove.push(key);
    }
  });

  toRemove.forEach(key => state.pheromoneMap.delete(key));
}

// --- Events ---
function updateEvents(state: GameState) {
  for (const event of state.events) {
    event.timer--;

    // Apply event effects
    switch (event.type) {
      case EventType.Rain:
        // Increase water levels near surface
        for (let y = SURFACE_ROW; y < Math.min(SURFACE_ROW + 10, MAP_HEIGHT); y++) {
          for (let x = 0; x < MAP_WIDTH; x++) {
            if (state.map[y][x].terrain === TerrainType.Tunnel || state.map[y][x].terrain === TerrainType.Chamber) {
              state.map[y][x].waterLevel = Math.min(1, state.map[y][x].waterLevel + 0.002);
            }
          }
        }
        break;

      case EventType.Drought:
        // Decrease water and humidity
        for (const row of state.map) {
          for (const cell of row) {
            cell.humidity = Math.max(0, cell.humidity - 0.001);
            cell.waterLevel = Math.max(0, cell.waterLevel - 0.002);
          }
        }
        break;

      case EventType.Collapse:
        // Random tunnel collapse
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
                }
              }
            }
          }
        }
        break;

      case EventType.Pesticide:
        // Kill ants on surface
        for (const ant of state.ants) {
          if (ant.y < SURFACE_ROW && ant.state !== AntState.Dead) {
            ant.health -= 2;
            if (ant.health <= 0) {
              ant.state = AntState.Dead;
              state.totalAntsLost++;
            }
          }
        }
        break;

      case EventType.ToxicFungus:
        // Increase contamination
        for (const row of state.map) {
          for (const cell of row) {
            if (cell.terrain === TerrainType.Chamber) {
              cell.contamination = Math.min(1, cell.contamination + 0.001);
            }
          }
        }
        break;

      case EventType.ColdSnap:
        for (const row of state.map) {
          for (const cell of row) {
            cell.temperature = Math.max(0, cell.temperature - 0.002);
          }
        }
        break;

      case EventType.HeatWave:
        for (const row of state.map) {
          for (const cell of row) {
            cell.temperature = Math.min(1, cell.temperature + 0.002);
          }
        }
        break;

      case EventType.EnemyRaid:
        // Spawn extra enemies
        if (state.tick % 30 === 0) {
          spawnEnemyAtEdge(state);
        }
        break;
    }
  }

  // Remove expired events
  state.events = state.events.filter(e => e.timer > 0);
}

function maybeSpawnEvent(state: GameState) {
  // Only spawn events occasionally
  if (state.tick % 600 !== 0) return; // Every ~10 seconds
  if (state.events.length >= 2) return;
  if (Math.random() > 0.3) return;

  const eventTypes = Object.values(EventType);
  const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
  const info = EVENT_INFO[type];

  const event: GameEvent = {
    type,
    timer: info.duration,
    maxTimer: info.duration,
    intensity: 0.3 + Math.random() * 0.7,
  };

  if (type === EventType.Collapse) {
    // Find a tunnel to collapse
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
      event.affectedArea = { x: target.x, y: target.y, radius: 2 };
    }
  }

  state.events.push(event);
  addNotification(state, `⚠ ${info.name}: ${info.description}`, 'warning');
}

function maybeSpawnSurfaceResources(state: GameState) {
  if (state.tick % 300 !== 0) return;
  if (state.surfaceDeposits.length >= 15) return;
  if (Math.random() > 0.5) return;

  const types = [ResourceType.Food, ResourceType.Protein, ResourceType.Sugar, ResourceType.Water];
  const type = types[Math.floor(Math.random() * types.length)];

  state.surfaceDeposits.push({
    id: genId(),
    x: 5 + Math.floor(Math.random() * (MAP_WIDTH - 10)),
    y: 4 + Math.floor(Math.random() * 3),
    type,
    amount: 15 + Math.floor(Math.random() * 25),
    maxAmount: 40,
    surface: true,
  });
}

function maybeSpawnEnemies(state: GameState) {
  if (state.tick % 400 !== 0) return;
  if (state.enemies.length >= 5) return;
  if (Math.random() > 0.4) return;

  spawnEnemyAtEdge(state);
}

function spawnEnemyAtEdge(state: GameState) {
  const enemyTypes = Object.values(EnemyType);
  // Weight by spawn weight
  const weighted: EnemyType[] = [];
  for (const type of enemyTypes) {
    for (let i = 0; i < ENEMY_STATS[type].spawnWeight; i++) {
      weighted.push(type);
    }
  }

  const type = weighted[Math.floor(Math.random() * weighted.length)];
  const side = Math.random() > 0.5;
  const x = side ? Math.floor(Math.random() * 10) : MAP_WIDTH - 1 - Math.floor(Math.random() * 10);
  const y = 3 + Math.floor(Math.random() * 5);

  state.enemies.push(createEnemy(type, x, y));
}

// --- Water Levels ---
function updateWaterLevels(state: GameState) {
  // Natural drainage
  for (const row of state.map) {
    for (const cell of row) {
      if (cell.waterLevel > 0) {
        cell.waterLevel = Math.max(0, cell.waterLevel - 0.0005);
      }
    }
  }

  // Humidity chambers reduce nearby water
  for (const row of state.map) {
    for (const cell of row) {
      if (cell.chamberType === ChamberType.HumidityChamber) {
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            const ny = cell.y + dy;
            const nx = cell.x + dx;
            if (ny >= 0 && ny < MAP_HEIGHT && nx >= 0 && nx < MAP_WIDTH) {
              state.map[ny][nx].waterLevel = Math.max(0, state.map[ny][nx].waterLevel - 0.001);
              state.map[ny][nx].humidity = Math.min(1, state.map[ny][nx].humidity + 0.0005);
            }
          }
        }
      }
    }
  }

  // Remove depleted surface deposits
  state.surfaceDeposits = state.surfaceDeposits.filter(d => d.amount > 0);
}

// --- Contamination ---
function updateContamination(state: GameState) {
  // Waste chambers reduce contamination
  for (const row of state.map) {
    for (const cell of row) {
      if (cell.chamberType === ChamberType.WasteChamber) {
        for (let dy = -4; dy <= 4; dy++) {
          for (let dx = -4; dx <= 4; dx++) {
            const ny = cell.y + dy;
            const nx = cell.x + dx;
            if (ny >= 0 && ny < MAP_HEIGHT && nx >= 0 && nx < MAP_WIDTH) {
              state.map[ny][nx].contamination = Math.max(0, state.map[ny][nx].contamination - 0.002);
            }
          }
        }
      }

      // Natural contamination decay
      if (cell.contamination > 0) {
        cell.contamination = Math.max(0, cell.contamination - 0.0003);
      }
    }
  }
}

// --- Colony Mind ---
function updateColonyMind(state: GameState) {
  const livingAnts = state.ants.filter(a => a.state !== AntState.Dead).length;
  const queen = state.ants.find(a => a.caste === AntCaste.Queen && a.state !== AntState.Dead);
  const hasFood = state.resources.food > 10;
  const hasEnemies = state.enemies.length > 0;

  // Consciousness increases with colony health
  let delta = 0;
  if (queen && queen.health > queen.maxHealth * 0.5) delta += 0.02;
  if (hasFood) delta += 0.01;
  if (livingAnts > 10) delta += 0.01;
  if (hasEnemies) delta -= 0.02;
  if (state.resources.food < 5) delta -= 0.03;
  if (!queen) delta -= 0.1;

  state.colonyMind.consciousness = Math.max(0, Math.min(100, state.colonyMind.consciousness + delta));

  // Update ability cooldowns
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

// --- Game Phase ---
function updateGamePhase(state: GameState) {
  const livingAnts = state.ants.filter(a => a.state !== AntState.Dead).length;

  if (livingAnts >= 50) {
    state.gamePhase = GamePhase.Empire;
  } else if (livingAnts >= 30) {
    state.gamePhase = GamePhase.Dominance;
  } else if (livingAnts >= 15) {
    state.gamePhase = GamePhase.Expansion;
  } else {
    state.gamePhase = GamePhase.Survival;
  }
}

// --- Notifications ---
function addNotification(state: GameState, message: string, type: GameNotification['type']) {
  state.notifications.push({
    id: genId(),
    message,
    type,
    tick: state.tick,
  });
  // Keep only last 10
  if (state.notifications.length > 10) {
    state.notifications = state.notifications.slice(-10);
  }
}

// --- Player Actions ---
export function excavateArea(state: GameState, cx: number, cy: number): GameState {
  const newState = { ...state };
  newState.map = state.map.map(row => row.map(cell => ({ ...cell })));

  // Excavate in a small radius
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      excavateCell(newState, cx + dx, cy + dy);
    }
  }

  return newState;
}

export function buildChamber(state: GameState, cx: number, cy: number, type: ChamberType): GameState {
  const info = CHAMBER_INFO[type];
  if (state.resources.compactEarth < info.cost.compactEarth || state.resources.biomass < info.cost.biomass) {
    return state;
  }

  const newState = { ...state };
  newState.map = state.map.map(row => row.map(cell => ({ ...cell })));
  newState.resources = { ...state.resources };

  const radius = info.size;
  let built = false;

  // Check if area is clear (tunnel or excavated)
  let canBuild = true;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= radius * radius) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || nx >= MAP_WIDTH || ny < SURFACE_ROW || ny >= MAP_HEIGHT) {
          canBuild = false;
          break;
        }
        const terrain = state.map[ny][nx].terrain;
        if (terrain !== TerrainType.Tunnel && terrain !== TerrainType.Chamber) {
          canBuild = false;
          break;
        }
      }
    }
  }

  if (canBuild) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= radius * radius) {
          const nx = cx + dx;
          const ny = cy + dy;
          newState.map[ny][nx].terrain = TerrainType.Chamber;
          newState.map[ny][nx].chamberType = type;
          newState.map[ny][nx].hardness = 0;
          newState.map[ny][nx].excavatable = false;
        }
      }
    }

    newState.resources.compactEarth -= info.cost.compactEarth;
    newState.resources.biomass -= info.cost.biomass;
    built = true;

    addNotification(newState, `Built ${info.name}!`, 'success');
  }

  return newState;
}

export function markPheromone(state: GameState, cx: number, cy: number, type: PheromoneType): GameState {
  if (state.resources.pheromones < 1) return state;

  const newState = { ...state };
  newState.pheromoneMap = new Map(state.pheromoneMap);
  newState.resources = { ...state.resources };

  // Mark pheromone in a radius
  const radius = 3;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= radius * radius) {
        addPheromone(newState, cx + dx, cy + dy, type, 0.9);
      }
    }
  }

  return newState;
}

export function activateMindAbility(state: GameState, abilityType: MindAbilityType): GameState {
  const newState = { ...state };
  newState.colonyMind = { ...state.colonyMind, abilities: state.colonyMind.abilities.map(a => ({ ...a })) };

  const ability = newState.colonyMind.abilities.find(a => a.type === abilityType);
  if (!ability) return state;
  if (ability.currentCooldown > 0) return state;
  if (newState.colonyMind.consciousness < ability.cost) return state;

  newState.colonyMind.consciousness -= ability.cost;
  ability.active = true;
  ability.remainingDuration = ability.duration;
  ability.currentCooldown = ability.cooldown;

  addNotification(newState, `Activated ${MIND_ABILITIES[abilityType].name}!`, 'success');

  return newState;
}

export function setGameSpeed(state: GameState, speed: number): GameState {
  return { ...state, speed: Math.max(1, Math.min(3, speed)) };
}

export function togglePause(state: GameState): GameState {
  return { ...state, paused: !state.paused };
}
