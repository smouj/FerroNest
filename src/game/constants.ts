// ============================================================
// FerroNest - Game Constants
// ============================================================

import { AntCaste, ChamberType, EnemyType, EventType, MindAbilityType, PheromoneType, TerrainType } from './types';

// --- Map Dimensions ---
export const MAP_WIDTH = 80;
export const MAP_HEIGHT = 60;
export const SURFACE_ROW = 8; // rows 0-7 are surface, 8+ are underground
export const CELL_SIZE = 12; // pixels per cell

// --- Timing ---
export const TICKS_PER_DAY = 600; // 10 seconds at 60fps
export const DAY_DURATION_SECONDS = 10;

// --- Ant Stats by Caste ---
export const ANT_STATS: Record<AntCaste, {
  maxHealth: number;
  speed: number;
  attack: number;
  carryCapacity: number;
  maxAge: number;
  foodConsumption: number;
  proteinConsumption: number;
}> = {
  [AntCaste.Queen]: {
    maxHealth: 200,
    speed: 0.3,
    attack: 5,
    carryCapacity: 0,
    maxAge: 180000, // ~300 days
    foodConsumption: 2,
    proteinConsumption: 1,
  },
  [AntCaste.Worker]: {
    maxHealth: 30,
    speed: 0.8,
    attack: 3,
    carryCapacity: 5,
    maxAge: 60000, // ~100 days
    foodConsumption: 0.5,
    proteinConsumption: 0,
  },
  [AntCaste.Scout]: {
    maxHealth: 20,
    speed: 1.5,
    attack: 2,
    carryCapacity: 2,
    maxAge: 40000,
    foodConsumption: 0.8,
    proteinConsumption: 0,
  },
  [AntCaste.Soldier]: {
    maxHealth: 80,
    speed: 0.5,
    attack: 15,
    carryCapacity: 2,
    maxAge: 50000,
    foodConsumption: 1,
    proteinConsumption: 1.5,
  },
  [AntCaste.Nurse]: {
    maxHealth: 25,
    speed: 0.6,
    attack: 1,
    carryCapacity: 3,
    maxAge: 55000,
    foodConsumption: 0.5,
    proteinConsumption: 0.3,
  },
  [AntCaste.Builder]: {
    maxHealth: 40,
    speed: 0.6,
    attack: 4,
    carryCapacity: 8,
    maxAge: 55000,
    foodConsumption: 0.6,
    proteinConsumption: 0.5,
  },
  [AntCaste.Cultivator]: {
    maxHealth: 25,
    speed: 0.5,
    attack: 2,
    carryCapacity: 4,
    maxAge: 60000,
    foodConsumption: 0.4,
    proteinConsumption: 0,
  },
};

// --- Chamber Costs & Properties ---
export const CHAMBER_INFO: Record<ChamberType, {
  name: string;
  description: string;
  size: number; // radius in cells
  cost: { compactEarth: number; biomass: number };
  color: string;
  icon: string;
}> = {
  [ChamberType.QueenChamber]: {
    name: 'Queen Chamber',
    description: 'Home of the queen. Protect at all costs.',
    size: 3,
    cost: { compactEarth: 5, biomass: 0 },
    color: '#D4A017',
    icon: '👑',
  },
  [ChamberType.BroodChamber]: {
    name: 'Brood Chamber',
    description: 'Hatch eggs and raise larvae.',
    size: 3,
    cost: { compactEarth: 3, biomass: 1 },
    color: '#E8B4B8',
    icon: '🥚',
  },
  [ChamberType.FoodStorage]: {
    name: 'Food Storage',
    description: 'Store food for the colony.',
    size: 3,
    cost: { compactEarth: 2, biomass: 0 },
    color: '#8B6914',
    icon: '🍯',
  },
  [ChamberType.FungusChamber]: {
    name: 'Fungus Chamber',
    description: 'Grow fungus for stable food supply.',
    size: 3,
    cost: { compactEarth: 3, biomass: 3 },
    color: '#7B9E6B',
    icon: '🍄',
  },
  [ChamberType.Barracks]: {
    name: 'Barracks',
    description: 'Train soldiers faster.',
    size: 3,
    cost: { compactEarth: 4, biomass: 2 },
    color: '#8B2500',
    icon: '⚔️',
  },
  [ChamberType.PheromoneChamber]: {
    name: 'Pheromone Chamber',
    description: 'Boost pheromone range and strength.',
    size: 2,
    cost: { compactEarth: 3, biomass: 3 },
    color: '#9B59B6',
    icon: '🧪',
  },
  [ChamberType.WasteChamber]: {
    name: 'Waste Chamber',
    description: 'Prevents disease. Essential for large colonies.',
    size: 2,
    cost: { compactEarth: 2, biomass: 0 },
    color: '#556B2F',
    icon: '🗑️',
  },
  [ChamberType.HumidityChamber]: {
    name: 'Humidity Chamber',
    description: 'Controls nearby temperature and humidity.',
    size: 2,
    cost: { compactEarth: 3, biomass: 1 },
    color: '#4A90B8',
    icon: '💧',
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
}> = {
  [EnemyType.Spider]: {
    name: 'Spider',
    maxHealth: 60,
    attack: 12,
    speed: 0.7,
    color: '#4A4A4A',
    size: 1.5,
    spawnWeight: 3,
  },
  [EnemyType.Beetle]: {
    name: 'Beetle',
    maxHealth: 100,
    attack: 8,
    speed: 0.3,
    color: '#3D2B1F',
    size: 2,
    spawnWeight: 2,
  },
  [EnemyType.Centipede]: {
    name: 'Centipede',
    maxHealth: 80,
    attack: 10,
    speed: 0.9,
    color: '#8B0000',
    size: 1.8,
    spawnWeight: 1,
  },
  [EnemyType.Wasp]: {
    name: 'Wasp',
    maxHealth: 50,
    attack: 18,
    speed: 1.5,
    color: '#FFD700',
    size: 1.3,
    spawnWeight: 1,
  },
  [EnemyType.RivalAnt]: {
    name: 'Rival Ant',
    maxHealth: 30,
    attack: 6,
    speed: 0.8,
    color: '#8B4513',
    size: 1,
    spawnWeight: 4,
  },
  [EnemyType.Termite]: {
    name: 'Termite',
    maxHealth: 40,
    attack: 5,
    speed: 0.4,
    color: '#DEB887',
    size: 1,
    spawnWeight: 3,
  },
};

// --- Event Properties ---
export const EVENT_INFO: Record<EventType, {
  name: string;
  description: string;
  duration: number; // ticks
  color: string;
}> = {
  [EventType.Rain]: {
    name: 'Rain',
    description: 'Water floods the tunnels!',
    duration: 300,
    color: '#4A90B8',
  },
  [EventType.Drought]: {
    name: 'Drought',
    description: 'Water sources dry up.',
    duration: 400,
    color: '#D2691E',
  },
  [EventType.Collapse]: {
    name: 'Tunnel Collapse',
    description: 'Unstable tunnels cave in!',
    duration: 60,
    color: '#8B4513',
  },
  [EventType.ColdSnap]: {
    name: 'Cold Snap',
    description: 'Temperature drops dangerously.',
    duration: 200,
    color: '#B0C4DE',
  },
  [EventType.HeatWave]: {
    name: 'Heat Wave',
    description: 'Extreme heat stress.',
    duration: 250,
    color: '#FF4500',
  },
  [EventType.ToxicFungus]: {
    name: 'Toxic Fungus',
    description: 'Dangerous mold grows in chambers.',
    duration: 200,
    color: '#9ACD32',
  },
  [EventType.Pesticide]: {
    name: 'Pesticide',
    description: 'Humans spray chemicals on the surface!',
    duration: 300,
    color: '#FF1493',
  },
  [EventType.EnemyRaid]: {
    name: 'Enemy Raid',
    description: 'A swarm of enemies attacks!',
    duration: 200,
    color: '#DC143C',
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
    description: 'Workers speed up all tasks.',
    cost: 20,
    cooldown: 300,
    duration: 150,
  },
  [MindAbilityType.TotalAlarm]: {
    name: 'Total Alarm',
    description: 'All soldiers rush to entrances.',
    cost: 30,
    cooldown: 400,
    duration: 100,
  },
  [MindAbilityType.PerfectRoute]: {
    name: 'Perfect Route',
    description: 'Transport efficiency doubles.',
    cost: 25,
    cooldown: 350,
    duration: 200,
  },
  [MindAbilityType.DefensiveSacrifice]: {
    name: 'Defensive Sacrifice',
    description: 'Workers block tunnels to protect the queen.',
    cost: 40,
    cooldown: 600,
    duration: 80,
  },
  [MindAbilityType.EmergencyMigration]: {
    name: 'Emergency Migration',
    description: 'Move eggs and queen rapidly.',
    cost: 50,
    cooldown: 800,
    duration: 60,
  },
  [MindAbilityType.ChemicalFury]: {
    name: 'Chemical Fury',
    description: 'Coordinated mass attack.',
    cost: 60,
    cooldown: 1000,
    duration: 120,
  },
};

// --- Terrain Colors ---
export const TERRAIN_COLORS: Record<TerrainType, string> = {
  [TerrainType.Sky]: '#1a1a2e',
  [TerrainType.SurfaceGrass]: '#2d5a27',
  [TerrainType.SurfaceDirt]: '#5c4033',
  [TerrainType.Dirt]: '#3e2723',
  [TerrainType.HardDirt]: '#2c1b14',
  [TerrainType.Stone]: '#4a4a4a',
  [TerrainType.Tunnel]: '#1a1410',
  [TerrainType.Chamber]: '#1a1410',
  [TerrainType.Water]: '#1565C0',
  [TerrainType.Roots]: '#3E2723',
};

// --- Brood Timing ---
export const BROOD_TIMING = {
  eggToLarva: 150, // ticks
  larvaToPupa: 250,
  pupaToHatch: 200,
  foodPerLarvaPerTick: 0.01,
};

// --- Pheromone Settings ---
export const PHEROMONE_SETTINGS = {
  decayRate: 0.001, // per tick
  maxStrength: 1,
  spreadRate: 0.01,
  attractionRadius: 5,
};

// --- Camera ---
export const CAMERA_SETTINGS = {
  minZoom: 0.5,
  maxZoom: 2,
  zoomSpeed: 0.1,
  panSpeed: 10,
};
