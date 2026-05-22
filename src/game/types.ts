// ============================================================
// FerroNest - Core Game Types
// ============================================================

// --- Map & Terrain ---

export enum TerrainType {
  Sky = 'sky',
  SurfaceGrass = 'surface_grass',
  SurfaceDirt = 'surface_dirt',
  Dirt = 'dirt',
  HardDirt = 'hard_dirt',
  Stone = 'stone',
  Tunnel = 'tunnel',
  Chamber = 'chamber',
  Water = 'water',
  Roots = 'roots',
}

export enum ChamberType {
  QueenChamber = 'queen_chamber',
  BroodChamber = 'brood_chamber',
  FoodStorage = 'food_storage',
  FungusChamber = 'fungus_chamber',
  Barracks = 'barracks',
  PheromoneChamber = 'pheromone_chamber',
  WasteChamber = 'waste_chamber',
  HumidityChamber = 'humidity_chamber',
}

export interface Cell {
  x: number;
  y: number;
  terrain: TerrainType;
  chamberType?: ChamberType;
  hardness: number; // 0-1, how hard to excavate
  humidity: number; // 0-1
  temperature: number; // 0-1
  contamination: number; // 0-1, disease level
  waterLevel: number; // 0-1, flooding
  excavatable: boolean;
}

// --- Ants & Castes ---
export enum AntCaste {
  Queen = 'queen',
  Worker = 'worker',
  Scout = 'scout',
  Soldier = 'soldier',
  Nurse = 'nurse',
  Builder = 'builder',
  Cultivator = 'cultivator',
}

export enum AntState {
  Idle = 'idle',
  Moving = 'moving',
  Excavating = 'excavating',
  Carrying = 'carrying',
  Fighting = 'fighting',
  Feeding = 'feeding',
  Nursing = 'nursing',
  Building = 'building',
  Fleeing = 'fleeing',
  Exploring = 'exploring',
  Dead = 'dead',
}

export interface Ant {
  id: string;
  caste: AntCaste;
  state: AntState;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  health: number;
  maxHealth: number;
  hunger: number; // 0-1, 0 = full, 1 = starving
  age: number; // ticks
  maxAge: number;
  speed: number;
  attack: number;
  carryCapacity: number;
  carrying: ResourceType | null;
  carryAmount: number;
  path: { x: number; y: number }[];
  pathIndex: number;
  stateTimer: number;
  assignedChamber?: { x: number; y: number };
}

// --- Resources ---
export enum ResourceType {
  Food = 'food',
  Protein = 'protein',
  Sugar = 'sugar',
  Fungus = 'fungus',
  Water = 'water',
  Biomass = 'biomass',
  CompactEarth = 'compact_earth',
}

export interface ResourceDeposit {
  id: string;
  x: number;
  y: number;
  type: ResourceType;
  amount: number;
  maxAmount: number;
  surface: boolean; // on surface or underground
}

export interface ColonyResources {
  food: number;
  protein: number;
  sugar: number;
  fungus: number;
  water: number;
  pheromones: number;
  biomass: number;
  compactEarth: number;
}

// --- Pheromones ---
export enum PheromoneType {
  Collect = 'collect',
  Excavate = 'excavate',
  Defend = 'defend',
  Evacuate = 'evacuate',
  Explore = 'explore',
  Attack = 'attack',
  HighPriority = 'high_priority',
}

export interface PheromoneCell {
  type: PheromoneType;
  strength: number; // 0-1
  x: number;
  y: number;
}

// --- Enemies ---
export enum EnemyType {
  Spider = 'spider',
  Beetle = 'beetle',
  Centipede = 'centipede',
  Wasp = 'wasp',
  RivalAnt = 'rival_ant',
  Termite = 'termite',
}

export interface Enemy {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  health: number;
  maxHealth: number;
  attack: number;
  speed: number;
  path: { x: number; y: number }[];
  pathIndex: number;
  stateTimer: number;
}

// --- Events ---
export enum EventType {
  Rain = 'rain',
  Drought = 'drought',
  Collapse = 'collapse',
  ColdSnap = 'cold_snap',
  HeatWave = 'heat_wave',
  ToxicFungus = 'toxic_fungus',
  Pesticide = 'pesticide',
  EnemyRaid = 'enemy_raid',
}

export interface GameEvent {
  type: EventType;
  timer: number; // remaining ticks
  maxTimer: number;
  intensity: number; // 0-1
  affectedArea?: { x: number; y: number; radius: number };
}

// --- Colony Mind ---
export interface ColonyMind {
  consciousness: number; // 0-100
  abilities: MindAbility[];
}

export enum MindAbilityType {
  WorkSurge = 'work_surge',
  TotalAlarm = 'total_alarm',
  PerfectRoute = 'perfect_route',
  DefensiveSacrifice = 'defensive_sacrifice',
  EmergencyMigration = 'emergency_migration',
  ChemicalFury = 'chemical_fury',
}

export interface MindAbility {
  type: MindAbilityType;
  cost: number;
  cooldown: number;
  currentCooldown: number;
  active: boolean;
  duration: number;
  remainingDuration: number;
}

// --- Game State ---
export enum GamePhase {
  Survival = 'survival',
  Expansion = 'expansion',
  Dominance = 'dominance',
  Empire = 'empire',
}

export enum GameTool {
  Excavate = 'excavate',
  BuildChamber = 'build_chamber',
  MarkPheromone = 'mark_pheromone',
  Prioritize = 'prioritize',
  Evacuate = 'evacuate',
  Defend = 'defend',
  Expand = 'expand',
}

export interface GameState {
  running: boolean;
  paused: boolean;
  tick: number;
  day: number;
  dayProgress: number; // 0-1
  speed: number; // 1, 2, 3

  map: Cell[][];
  ants: Ant[];
  enemies: Enemy[];
  resources: ColonyResources;
  surfaceDeposits: ResourceDeposit[];
  pheromoneMap: Map<string, PheromoneCell>;
  events: GameEvent[];
  colonyMind: ColonyMind;

  // Stats
  totalAntsHatched: number;
  totalAntsLost: number;
  queenAlive: boolean;
  gamePhase: GamePhase;

  // UI State
  selectedTool: GameTool;
  selectedChamberType: ChamberType;
  selectedPheromoneType: PheromoneType;
  showPheromoneView: boolean;
  cameraX: number;
  cameraY: number;
  zoom: number;

  // Brood
  brood: Brood[];

  // Notifications
  notifications: GameNotification[];
}

export interface GameNotification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'danger' | 'success';
  tick: number;
}

// --- Brood ---
export enum BroodStage {
  Egg = 'egg',
  Larva = 'larva',
  Pupa = 'pupa',
}

export interface Brood {
  id: string;
  stage: BroodStage;
  caste: AntCaste;
  x: number;
  y: number;
  progress: number; // 0-1, when reaches 1, advances stage or hatches
  health: number;
  needsFood: boolean;
}
