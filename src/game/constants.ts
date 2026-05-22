// ============================================================
// FerroNest - Game Constants (Professional Edition)
// ============================================================

import { AntCaste, ChamberType, EnemyType, EventType, GamePhase, MindAbilityType, PheromoneType, TerrainType } from './types';

// --- Map Dimensions ---
export const MAP_WIDTH = 100;
export const MAP_HEIGHT = 70;
export const SURFACE_ROW = 10;
export const CELL_SIZE = 12;

// --- Timing ---
export const TICKS_PER_DAY = 600;
export const DAY_DURATION_SECONDS = 10;
export const TICK_RATE_MS = 1000 / 30;

// --- Ant Stats by Caste ---
export const ANT_STATS: Record<AntCaste, {
  maxHealth: number;
  speed: number;
  attack: number;
  carryCapacity: number;
  maxAge: number;
  foodConsumption: number;
  proteinConsumption: number;
  pheromoneEmission: number;
  fatigueRate: number;
  restRate: number;
  visionRange: number;
}> = {
  [AntCaste.Queen]: {
    maxHealth: 250,
    speed: 0.25,
    attack: 8,
    carryCapacity: 0,
    maxAge: 300000,
    foodConsumption: 2.5,
    proteinConsumption: 1.5,
    pheromoneEmission: 0.8,
    fatigueRate: 0.0005,
    restRate: 0.002,
    visionRange: 4,
  },
  [AntCaste.Worker]: {
    maxHealth: 35,
    speed: 0.7,
    attack: 3,
    carryCapacity: 6,
    maxAge: 72000,
    foodConsumption: 0.4,
    proteinConsumption: 0.05,
    pheromoneEmission: 0.5,
    fatigueRate: 0.002,
    restRate: 0.005,
    visionRange: 5,
  },
  [AntCaste.Scout]: {
    maxHealth: 22,
    speed: 1.4,
    attack: 2,
    carryCapacity: 2,
    maxAge: 45000,
    foodConsumption: 0.7,
    proteinConsumption: 0,
    pheromoneEmission: 0.7,
    fatigueRate: 0.003,
    restRate: 0.004,
    visionRange: 8,
  },
  [AntCaste.Soldier]: {
    maxHealth: 100,
    speed: 0.45,
    attack: 18,
    carryCapacity: 2,
    maxAge: 55000,
    foodConsumption: 1.0,
    proteinConsumption: 1.5,
    pheromoneEmission: 0.3,
    fatigueRate: 0.001,
    restRate: 0.003,
    visionRange: 6,
  },
  [AntCaste.Nurse]: {
    maxHealth: 28,
    speed: 0.55,
    attack: 1,
    carryCapacity: 3,
    maxAge: 65000,
    foodConsumption: 0.5,
    proteinConsumption: 0.3,
    pheromoneEmission: 0.4,
    fatigueRate: 0.0015,
    restRate: 0.005,
    visionRange: 4,
  },
  [AntCaste.Builder]: {
    maxHealth: 45,
    speed: 0.55,
    attack: 5,
    carryCapacity: 10,
    maxAge: 60000,
    foodConsumption: 0.6,
    proteinConsumption: 0.5,
    pheromoneEmission: 0.4,
    fatigueRate: 0.002,
    restRate: 0.004,
    visionRange: 5,
  },
  [AntCaste.Cultivator]: {
    maxHealth: 28,
    speed: 0.45,
    attack: 2,
    carryCapacity: 4,
    maxAge: 70000,
    foodConsumption: 0.3,
    proteinConsumption: 0,
    pheromoneEmission: 0.3,
    fatigueRate: 0.001,
    restRate: 0.006,
    visionRange: 4,
  },
};

// --- Chamber Costs & Properties ---
export const CHAMBER_INFO: Record<ChamberType, {
  name: string;
  description: string;
  size: number;
  cost: { compactEarth: number; biomass: number };
  color: string;
  icon: string;
  effect: string;
}> = {
  [ChamberType.QueenChamber]: {
    name: 'Queen Chamber',
    description: 'Home of the queen. Protect at all costs.',
    size: 3,
    cost: { compactEarth: 5, biomass: 0 },
    color: '#D4A017',
    icon: '▲',
    effect: 'Queen lays eggs here',
  },
  [ChamberType.BroodChamber]: {
    name: 'Brood Chamber',
    description: 'Hatch eggs and raise larvae. Needs stable temperature.',
    size: 3,
    cost: { compactEarth: 3, biomass: 1 },
    color: '#E8B4B8',
    icon: '◎',
    effect: 'Eggs develop 20% faster',
  },
  [ChamberType.FoodStorage]: {
    name: 'Food Storage',
    description: 'Store food for the colony. Reduces spoilage.',
    size: 3,
    cost: { compactEarth: 2, biomass: 0 },
    color: '#8B6914',
    icon: '◉',
    effect: 'Food spoilage -50%',
  },
  [ChamberType.FungusChamber]: {
    name: 'Fungus Garden',
    description: 'Grow fungus for stable food supply. Needs humidity.',
    size: 3,
    cost: { compactEarth: 3, biomass: 3 },
    color: '#7B9E6B',
    icon: '✦',
    effect: 'Produces fungus over time',
  },
  [ChamberType.Barracks]: {
    name: 'Barracks',
    description: 'Train soldiers faster. Soldiers rest here.',
    size: 3,
    cost: { compactEarth: 4, biomass: 2 },
    color: '#8B2500',
    icon: '⚔',
    effect: 'Soldiers +20% attack nearby',
  },
  [ChamberType.PheromoneChamber]: {
    name: 'Pheromone Lab',
    description: 'Boost pheromone range and strength.',
    size: 2,
    cost: { compactEarth: 3, biomass: 3 },
    color: '#9B59B6',
    icon: '◈',
    effect: 'Pheromone strength +30%',
  },
  [ChamberType.WasteChamber]: {
    name: 'Waste Chamber',
    description: 'Prevents disease. Essential for large colonies.',
    size: 2,
    cost: { compactEarth: 2, biomass: 0 },
    color: '#556B2F',
    icon: '▼',
    effect: 'Contamination -60% nearby',
  },
  [ChamberType.HumidityChamber]: {
    name: 'Humidity Chamber',
    description: 'Controls nearby temperature and humidity.',
    size: 2,
    cost: { compactEarth: 3, biomass: 1 },
    color: '#4A90B8',
    icon: '≈',
    effect: 'Stabilizes humidity +40%',
  },
  [ChamberType.NurseryChamber]: {
    name: 'Nursery',
    description: 'Dedicated care space for larvae. Nurses work better here.',
    size: 2,
    cost: { compactEarth: 2, biomass: 2 },
    color: '#FFB6C1',
    icon: '◇',
    effect: 'Brood survival +25%',
  },
  [ChamberType.GranaryChamber]: {
    name: 'Granary',
    description: 'Specialized storage for seeds and dry food.',
    size: 2,
    cost: { compactEarth: 2, biomass: 1 },
    color: '#DAA520',
    icon: '▤',
    effect: 'Sugar/nectar storage +50%',
  },
};

// --- Pheromone Colors ---
export const PHEROMONE_COLORS: Record<PheromoneType, string> = {
  [PheromoneType.Collect]: '#4CAF50',
  [PheromoneType.Excavate]: '#FF9800',
  [PheromoneType.Defend]: '#F44336',
  [PheromoneType.Evacuate]: '#FFEB3B',
  [PheromoneType.Explore]: '#2196F3',
  [PheromoneType.Attack]: '#9C27B0',
  [PheromoneType.HighPriority]: '#FF5722',
  [PheromoneType.Home]: '#8D6E63',
  [PheromoneType.Food]: '#FFC107',
  [PheromoneType.Danger]: '#FF1744',
};

export const PHEROMONE_NAMES: Record<PheromoneType, string> = {
  [PheromoneType.Collect]: 'Collect',
  [PheromoneType.Excavate]: 'Dig',
  [PheromoneType.Defend]: 'Defend',
  [PheromoneType.Evacuate]: 'Evac',
  [PheromoneType.Explore]: 'Explore',
  [PheromoneType.Attack]: 'Attack',
  [PheromoneType.HighPriority]: 'Priority',
  [PheromoneType.Home]: 'Home',
  [PheromoneType.Food]: 'Food Trail',
  [PheromoneType.Danger]: 'Danger',
};

// --- Enemy Stats ---
export const ENEMY_STATS: Record<EnemyType, {
  name: string;
  maxHealth: number;
  attack: number;
  speed: number;
  color: string;
  size: number;
  spawnWeight: number;
  aggroRange: number;
  behavior: string;
  loot: { type: string; amount: number }[];
}> = {
  [EnemyType.Spider]: {
    name: 'Wolf Spider',
    maxHealth: 70,
    attack: 14,
    speed: 0.8,
    color: '#3A3A3A',
    size: 1.8,
    spawnWeight: 3,
    aggroRange: 8,
    behavior: 'hunt',
    loot: [{ type: 'protein', amount: 8 }, { type: 'biomass', amount: 3 }],
  },
  [EnemyType.Beetle]: {
    name: 'Ground Beetle',
    maxHealth: 120,
    attack: 8,
    speed: 0.3,
    color: '#2C1810',
    size: 2.2,
    spawnWeight: 2,
    aggroRange: 4,
    behavior: 'territorial',
    loot: [{ type: 'protein', amount: 12 }, { type: 'biomass', amount: 5 }],
  },
  [EnemyType.Centipede]: {
    name: 'Centipede',
    maxHealth: 90,
    attack: 12,
    speed: 1.0,
    color: '#8B0000',
    size: 2.0,
    spawnWeight: 1,
    aggroRange: 6,
    behavior: 'hunt',
    loot: [{ type: 'protein', amount: 10 }, { type: 'biomass', amount: 4 }],
  },
  [EnemyType.Wasp]: {
    name: 'Paper Wasp',
    maxHealth: 45,
    attack: 22,
    speed: 1.8,
    color: '#E8B820',
    size: 1.2,
    spawnWeight: 1,
    aggroRange: 10,
    behavior: 'hunt',
    loot: [{ type: 'sugar', amount: 6 }, { type: 'protein', amount: 3 }],
  },
  [EnemyType.RivalAnt]: {
    name: 'Rival Ant',
    maxHealth: 35,
    attack: 7,
    speed: 0.8,
    color: '#5D3A1A',
    size: 1.0,
    spawnWeight: 4,
    aggroRange: 5,
    behavior: 'raid',
    loot: [{ type: 'food', amount: 4 }, { type: 'protein', amount: 2 }],
  },
  [EnemyType.Termite]: {
    name: 'Termite Soldier',
    maxHealth: 50,
    attack: 6,
    speed: 0.35,
    color: '#C4A882',
    size: 1.0,
    spawnWeight: 3,
    aggroRange: 3,
    behavior: 'territorial',
    loot: [{ type: 'biomass', amount: 6 }, { type: 'compactEarth', amount: 2 }],
  },
  [EnemyType.Antlion]: {
    name: 'Antlion',
    maxHealth: 80,
    attack: 20,
    speed: 0.2,
    color: '#8B7355',
    size: 2.0,
    spawnWeight: 1,
    aggroRange: 3,
    behavior: 'ambush',
    loot: [{ type: 'protein', amount: 15 }, { type: 'biomass', amount: 8 }],
  },
  [EnemyType.Mite]: {
    name: 'Parasitic Mite',
    maxHealth: 10,
    attack: 2,
    speed: 0.5,
    color: '#8B0000',
    size: 0.4,
    spawnWeight: 2,
    aggroRange: 2,
    behavior: 'wander',
    loot: [{ type: 'biomass', amount: 1 }],
  },
};

// --- Event Properties ---
export const EVENT_INFO: Record<EventType, {
  name: string;
  description: string;
  duration: number;
  color: string;
  severity: number;
}> = {
  [EventType.Rain]: {
    name: 'Rain',
    description: 'Water floods the tunnels!',
    duration: 300,
    color: '#4A90B8',
    severity: 2,
  },
  [EventType.Drought]: {
    name: 'Drought',
    description: 'Water sources dry up.',
    duration: 400,
    color: '#D2691E',
    severity: 2,
  },
  [EventType.Collapse]: {
    name: 'Tunnel Collapse',
    description: 'Unstable tunnels cave in!',
    duration: 60,
    color: '#8B4513',
    severity: 3,
  },
  [EventType.ColdSnap]: {
    name: 'Cold Snap',
    description: 'Temperature drops dangerously.',
    duration: 200,
    color: '#B0C4DE',
    severity: 2,
  },
  [EventType.HeatWave]: {
    name: 'Heat Wave',
    description: 'Extreme heat stress.',
    duration: 250,
    color: '#FF4500',
    severity: 2,
  },
  [EventType.ToxicFungus]: {
    name: 'Toxic Fungus',
    description: 'Dangerous mold grows in chambers.',
    duration: 200,
    color: '#9ACD32',
    severity: 3,
  },
  [EventType.Pesticide]: {
    name: 'Pesticide',
    description: 'Humans spray chemicals on the surface!',
    duration: 300,
    color: '#FF1493',
    severity: 4,
  },
  [EventType.EnemyRaid]: {
    name: 'Enemy Raid',
    description: 'A swarm of enemies attacks!',
    duration: 200,
    color: '#DC143C',
    severity: 4,
  },
  [EventType.Earthquake]: {
    name: 'Earthquake',
    description: 'The ground shakes violently!',
    duration: 80,
    color: '#696969',
    severity: 5,
  },
  [EventType.Flood]: {
    name: 'Flash Flood',
    description: 'Water rushes into the colony!',
    duration: 150,
    color: '#1E88E5',
    severity: 4,
  },
};

// --- Mind Abilities ---
export const MIND_ABILITIES: Record<MindAbilityType, {
  name: string;
  description: string;
  cost: number;
  cooldown: number;
  duration: number;
}> = {
  [MindAbilityType.WorkSurge]: {
    name: 'Work Surge',
    description: 'Workers move 50% faster for a period.',
    cost: 20,
    cooldown: 300,
    duration: 200,
  },
  [MindAbilityType.TotalAlarm]: {
    name: 'Total Alarm',
    description: 'All soldiers rush to defend entrances.',
    cost: 30,
    cooldown: 400,
    duration: 150,
  },
  [MindAbilityType.PerfectRoute]: {
    name: 'Perfect Route',
    description: 'All ants find optimal paths instantly.',
    cost: 25,
    cooldown: 350,
    duration: 250,
  },
  [MindAbilityType.DefensiveSacrifice]: {
    name: 'Last Stand',
    description: 'Workers block tunnels to protect the queen.',
    cost: 40,
    cooldown: 600,
    duration: 100,
  },
  [MindAbilityType.EmergencyMigration]: {
    name: 'Evacuation',
    description: 'Move eggs and queen to a safe chamber.',
    cost: 50,
    cooldown: 800,
    duration: 80,
  },
  [MindAbilityType.ChemicalFury]: {
    name: 'Chemical Fury',
    description: 'All ants attack with doubled ferocity.',
    cost: 60,
    cooldown: 1000,
    duration: 150,
  },
};

// --- Terrain Colors ---
export const TERRAIN_COLORS: Record<TerrainType, string> = {
  [TerrainType.Sky]: '#0d1117',
  [TerrainType.SurfaceGrass]: '#2d5a27',
  [TerrainType.SurfaceDirt]: '#5c4033',
  [TerrainType.Dirt]: '#3e2723',
  [TerrainType.HardDirt]: '#2c1b14',
  [TerrainType.Stone]: '#4a4a4a',
  [TerrainType.Tunnel]: '#1a1410',
  [TerrainType.Chamber]: '#1a1410',
  [TerrainType.Water]: '#1565C0',
  [TerrainType.Roots]: '#3E2723',
  [TerrainType.Clay]: '#A0522D',
  [TerrainType.Sand]: '#C2B280',
};

// --- Brood Timing ---
export const BROOD_TIMING = {
  eggToLarva: 120,
  larvaToPupa: 200,
  pupaToHatch: 160,
  foodPerLarvaPerTick: 0.008,
};

// --- Pheromone Settings ---
export const PHEROMONE_SETTINGS = {
  decayRate: 0.0008,
  maxStrength: 1,
  spreadRate: 0.005,
  attractionRadius: 6,
  playerMarkStrength: 0.8,
  antEmissionStrength: 0.4,
  diffuseRadius: 2,
  diffuseRate: 0.02,
};

// --- Camera ---
export const CAMERA_SETTINGS = {
  minZoom: 0.4,
  maxZoom: 2.5,
  zoomSpeed: 0.1,
  panSpeed: 12,
  smoothPanFactor: 0.15,
};

// --- Personality Modifiers ---
export const PERSONALITY_MODIFIERS: Record<string, {
  workDurationMul: number;
  fleeThresholdMul: number;
  exploreRangeMul: number;
  attackAggressionMul: number;
  socialDistance: number;
}> = {
  diligent: { workDurationMul: 1.4, fleeThresholdMul: 1.0, exploreRangeMul: 0.8, attackAggressionMul: 1.0, socialDistance: 5 },
  brave: { workDurationMul: 1.0, fleeThresholdMul: 0.3, exploreRangeMul: 1.2, attackAggressionMul: 1.3, socialDistance: 8 },
  curious: { workDurationMul: 0.8, fleeThresholdMul: 1.0, exploreRangeMul: 2.0, attackAggressionMul: 0.7, socialDistance: 15 },
  cautious: { workDurationMul: 0.9, fleeThresholdMul: 1.5, exploreRangeMul: 0.6, attackAggressionMul: 0.5, socialDistance: 3 },
  aggressive: { workDurationMul: 0.7, fleeThresholdMul: 0.2, exploreRangeMul: 1.0, attackAggressionMul: 2.0, socialDistance: 6 },
  social: { workDurationMul: 1.1, fleeThresholdMul: 1.2, exploreRangeMul: 0.7, attackAggressionMul: 0.8, socialDistance: 2 },
};

// --- Game Phase Thresholds ---
export const PHASE_THRESHOLDS = {
  [GamePhase.Survival]: { minAnts: 0, minDay: 0 },
  [GamePhase.Expansion]: { minAnts: 15, minDay: 5 },
  [GamePhase.Dominance]: { minAnts: 40, minDay: 15 },
  [GamePhase.Empire]: { minAnts: 80, minDay: 30 },
};

// --- Fog of War ---
export const FOG_SETTINGS = {
  revealRadius: 6,
  dimRadius: 10,
  minLight: 0.15,
  surfaceLight: 0.9,
  tunnelLight: 0.4,
  chamberLight: 0.6,
};

// --- Score Values ---
export const SCORE_VALUES = {
  perAnt: 10,
  perDay: 5,
  perChamber: 20,
  perEnemyKilled: 15,
  perBroodHatched: 5,
  queenAliveBonus: 100,
};
