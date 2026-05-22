// ============================================================
// FerroNest - Core Game Types (Professional Edition)
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
  Clay = 'clay',
  Sand = 'sand',
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
  NurseryChamber = 'nursery_chamber',
  GranaryChamber = 'granary_chamber',
}

export interface Cell {
  x: number;
  y: number;
  terrain: TerrainType;
  chamberType?: ChamberType;
  hardness: number;
  humidity: number;
  temperature: number;
  contamination: number;
  waterLevel: number;
  excavatable: boolean;
  explored: boolean; // Fog of war
  lightLevel: number; // 0-1, for visual atmosphere
  tunnelQuality: number; // 0-1, affects ant speed
  soilNutrients: number; // For fungus growth
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
  Resting = 'resting',
  Returning = 'returning',
  Harvesting = 'harvesting',
  Patrolling = 'patrolling',
  Cultivating = 'cultivating',
}

export enum AntPersonality {
  Diligent = 'diligent',     // Works longer before resting
  Brave = 'brave',           // Less likely to flee
  Curious = 'curious',       // Explores further
  Cautious = 'cautious',     // Avoids danger
  Aggressive = 'aggressive', // Attacks enemies on sight
  Social = 'social',         // Stays near other ants
}

export interface AntMemory {
  lastFoodSource: { x: number; y: number } | null;
  lastDangerLocation: { x: number; y: number } | null;
  homePosition: { x: number; y: number };
  visitedChambers: string[];
  resourceLocations: { x: number; y: number; type: ResourceType }[];
  dangerTimer: number; // ticks since last danger
}

export interface Ant {
  id: string;
  caste: AntCaste;
  state: AntState;
  prevState: AntState;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  health: number;
  maxHealth: number;
  hunger: number;
  age: number;
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
  personality: AntPersonality;
  memory: AntMemory;
  fatigue: number; // 0-1, need to rest when high
  experience: number; // Increases with tasks done
  loyalty: number; // Affects colony mind charge rate
  lastPheromoneTick: number; // Cooldown for pheromone emission
  facingAngle: number; // For smooth rotation
  animationFrame: number; // For leg animation
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
  Nectar = 'nectar',
  LeafFragments = 'leaf_fragments',
}

export interface ResourceDeposit {
  id: string;
  x: number;
  y: number;
  type: ResourceType;
  amount: number;
  maxAmount: number;
  surface: boolean;
  respawnRate: number; // Amount regenerated per day
  depleted: boolean;
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
  nectar: number;
  leafFragments: number;
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
  Home = 'home',
  Food = 'food',
  Danger = 'danger',
}

export interface PheromoneCell {
  type: PheromoneType;
  strength: number;
  x: number;
  y: number;
  age: number; // For visualization fading
}

// --- Influence Map ---
export interface InfluenceCell {
  collectPressure: number;
  defendPressure: number;
  explorePressure: number;
  dangerLevel: number;
  foodAttraction: number;
  homeAttraction: number;
}

// --- Enemies ---

export enum EnemyType {
  Spider = 'spider',
  Beetle = 'beetle',
  Centipede = 'centipede',
  Wasp = 'wasp',
  RivalAnt = 'rival_ant',
  Termite = 'termite',
  Antlion = 'antlion',
  Mite = 'mite',
}

export enum EnemyBehavior {
  Wander = 'wander',
  Hunt = 'hunt',
  Raid = 'raid',
  Flee = 'flee',
  Ambush = 'ambush',
  Territorial = 'territorial',
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
  behavior: EnemyBehavior;
  aggroRange: number;
  lootTable: { type: ResourceType; amount: number }[];
  animationFrame: number;
  facingAngle: number;
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
  EnemyRaid = 'enemy_aid',
  Earthquake = 'earthquake',
  Flood = 'flood',
}

export interface GameEvent {
  type: EventType;
  timer: number;
  maxTimer: number;
  intensity: number;
  affectedArea?: { x: number; y: number; radius: number };
  announced: boolean;
}

// --- Colony Mind ---

export interface ColonyMind {
  consciousness: number;
  maxConsciousness: number;
  chargeRate: number;
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

// --- Evolution ---

export enum EvolutionBranch {
  Military = 'military',
  Agricultural = 'agricultural',
  Explorer = 'explorer',
  Subterranean = 'subterranean',
  Chemical = 'chemical',
}

export interface EvolutionUpgrade {
  branch: EvolutionBranch;
  level: number;
  unlocked: boolean;
  description: string;
  effect: string;
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
  Select = 'select',
}

export interface GameState {
  running: boolean;
  paused: boolean;
  currentTick: number;
  day: number;
  dayProgress: number;
  speed: number;
  timeOfDay: number; // 0-1, 0=midnight, 0.5=noon

  map: Cell[][];
  ants: Ant[];
  enemies: Enemy[];
  resources: ColonyResources;
  surfaceDeposits: ResourceDeposit[];
  pheromoneMap: Map<string, PheromoneCell>;
  influenceMap: InfluenceCell[][];
  events: GameEvent[];
  colonyMind: ColonyMind;
  evolutions: EvolutionUpgrade[];

  // Stats
  totalAntsHatched: number;
  totalAntsLost: number;
  queenAlive: boolean;
  gamePhase: GamePhase;
  colonyScore: number;

  // UI State
  selectedTool: GameTool;
  selectedChamberType: ChamberType;
  selectedPheromoneType: PheromoneType;
  showPheromoneView: boolean;
  showInfluenceView: boolean;
  showMinimap: boolean;
  cameraX: number;
  cameraY: number;
  zoom: number;
  hoveredCell: { x: number; y: number } | null;
  selectedAnt: string | null;

  // Brood
  brood: Brood[];

  // Notifications
  notifications: GameNotification[];

  // Ambient
  ambientLight: number; // 0-1, affected by time of day
}

export interface GameNotification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'danger' | 'success';
  currentTick: number;
  priority: number;
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
  progress: number;
  health: number;
  needsFood: boolean;
  temperature: number;
}

// --- Rendering ---

export interface RenderParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'dust' | 'spore' | 'spark' | 'rain' | 'dig' | 'combat' | 'pheromone' | 'glow' | 'bubble';
}
