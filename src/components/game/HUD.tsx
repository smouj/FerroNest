// ============================================================
// FerroNest - HUD (Heads-Up Display) - Professional Edition v2
// ============================================================

'use client';

import { useGameStore } from '@/game/store';
import { EVENT_INFO } from '@/game/constants';
import { AntCaste, AntState, GamePhase } from '@/game/types';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Wheat,
  Beef,
  Gem,
  Clover,
  Droplets,
  FlaskConical,
  Leaf,
  Mountain,
  Flower2,
  Crown,
  Hammer,
  Eye,
  Sword,
  Heart,
  Wrench,
  Sprout,
  Sun,
  Moon,
  Pause,
  Egg,
  Skull,
  Users,
  X,
  AlertTriangle,
  Zap,
  Clock,
  Package,
  Star,
  User,
} from 'lucide-react';
import type { ReactNode } from 'react';

// --- Resource Icons ---
const RESOURCE_ICONS: Record<string, ReactNode> = {
  food: <Wheat className="w-3 h-3 text-amber-500" />,
  protein: <Beef className="w-3 h-3 text-red-400" />,
  sugar: <Gem className="w-3 h-3 text-pink-400" />,
  fungus: <Clover className="w-3 h-3 text-emerald-400" />,
  water: <Droplets className="w-3 h-3 text-blue-400" />,
  pheromones: <FlaskConical className="w-3 h-3 text-purple-400" />,
  biomass: <Leaf className="w-3 h-3 text-green-500" />,
  compactEarth: <Mountain className="w-3 h-3 text-amber-700" />,
  nectar: <Flower2 className="w-3 h-3 text-yellow-400" />,
  leafFragments: <Leaf className="w-3 h-3 text-lime-500" />,
};

const RESOURCE_NAMES: Record<string, string> = {
  food: 'Food',
  protein: 'Protein',
  sugar: 'Sugar',
  fungus: 'Fungus',
  water: 'Water',
  pheromones: 'Pheromones',
  biomass: 'Biomass',
  compactEarth: 'Earth',
  nectar: 'Nectar',
  leafFragments: 'Leaves',
};

// Resource category colors for background
const RESOURCE_CATEGORY_BG: Record<string, string> = {
  // Food category (amber)
  food: 'bg-amber-900/30',
  protein: 'bg-amber-900/30',
  sugar: 'bg-amber-900/30',
  fungus: 'bg-amber-900/30',
  nectar: 'bg-amber-900/30',
  leafFragments: 'bg-amber-900/30',
  // Building category (brown)
  compactEarth: 'bg-yellow-900/30',
  biomass: 'bg-yellow-900/30',
  // Chemical category (purple)
  pheromones: 'bg-purple-900/30',
  // Water (blue)
  water: 'bg-blue-900/30',
};

const PHASE_COLORS: Record<GamePhase, string> = {
  [GamePhase.Survival]: 'bg-red-900/70 text-red-300 border-red-800/50',
  [GamePhase.Expansion]: 'bg-amber-900/70 text-amber-300 border-amber-800/50',
  [GamePhase.Dominance]: 'bg-emerald-900/70 text-emerald-300 border-emerald-800/50',
  [GamePhase.Empire]: 'bg-purple-900/70 text-purple-300 border-purple-800/50',
};

const CASTE_ICONS: Record<AntCaste, ReactNode> = {
  [AntCaste.Queen]: <Crown className="w-3 h-3 text-amber-400" />,
  [AntCaste.Worker]: <Hammer className="w-3 h-3 text-amber-300" />,
  [AntCaste.Scout]: <Eye className="w-3 h-3 text-blue-300" />,
  [AntCaste.Soldier]: <Sword className="w-3 h-3 text-red-400" />,
  [AntCaste.Nurse]: <Heart className="w-3 h-3 text-pink-300" />,
  [AntCaste.Builder]: <Wrench className="w-3 h-3 text-orange-300" />,
  [AntCaste.Cultivator]: <Sprout className="w-3 h-3 text-emerald-300" />,
};

const CASTE_NAMES: Record<AntCaste, string> = {
  [AntCaste.Queen]: 'Queen',
  [AntCaste.Worker]: 'Worker',
  [AntCaste.Scout]: 'Scout',
  [AntCaste.Soldier]: 'Soldier',
  [AntCaste.Nurse]: 'Nurse',
  [AntCaste.Builder]: 'Builder',
  [AntCaste.Cultivator]: 'Cultivator',
};

const STATE_LABELS: Record<AntState, string> = {
  [AntState.Idle]: 'Idle',
  [AntState.Moving]: 'Moving',
  [AntState.Excavating]: 'Excavating',
  [AntState.Carrying]: 'Carrying',
  [AntState.Fighting]: 'Fighting',
  [AntState.Feeding]: 'Feeding',
  [AntState.Nursing]: 'Nursing',
  [AntState.Building]: 'Building',
  [AntState.Fleeing]: 'Fleeing',
  [AntState.Exploring]: 'Exploring',
  [AntState.Dead]: 'Dead',
  [AntState.Resting]: 'Resting',
  [AntState.Returning]: 'Returning',
  [AntState.Harvesting]: 'Harvesting',
  [AntState.Patrolling]: 'Patrolling',
  [AntState.Cultivating]: 'Cultivating',
};

const STATE_COLORS: Record<AntState, string> = {
  [AntState.Idle]: 'text-gray-400',
  [AntState.Moving]: 'text-blue-400',
  [AntState.Excavating]: 'text-amber-400',
  [AntState.Carrying]: 'text-amber-300',
  [AntState.Fighting]: 'text-red-400',
  [AntState.Feeding]: 'text-green-400',
  [AntState.Nursing]: 'text-pink-400',
  [AntState.Building]: 'text-orange-400',
  [AntState.Fleeing]: 'text-yellow-400',
  [AntState.Exploring]: 'text-cyan-400',
  [AntState.Dead]: 'text-gray-600',
  [AntState.Resting]: 'text-purple-400',
  [AntState.Returning]: 'text-amber-400',
  [AntState.Harvesting]: 'text-green-400',
  [AntState.Patrolling]: 'text-blue-300',
  [AntState.Cultivating]: 'text-emerald-400',
};

// --- Day/Night Arc Indicator ---
function DayNightArc({ timeOfDay }: { timeOfDay: number }) {
  // timeOfDay: 0=midnight, 0.25=dawn, 0.5=noon, 0.75=dusk
  const isDay = timeOfDay > 0.2 && timeOfDay < 0.8;
  const arcAngle = timeOfDay * Math.PI; // 0 to PI over the day
  const indicatorX = 12 + Math.cos(Math.PI - arcAngle) * 10;
  const indicatorY = 12 - Math.sin(arcAngle) * 10;
  const isDawn = timeOfDay > 0.15 && timeOfDay < 0.3;
  const isDusk = timeOfDay > 0.7 && timeOfDay < 0.85;

  let color = '#1a1a3a'; // night
  if (isDawn) color = '#f59e0b';
  else if (isDusk) color = '#ea580c';
  else if (isDay) color = '#fbbf24';

  return (
    <svg width="28" height="20" viewBox="0 0 28 20" className="shrink-0">
      {/* Arc path */}
      <path
        d="M 4 16 Q 14 -4 24 16"
        fill="none"
        stroke={isDay ? 'rgba(251,191,36,0.3)' : 'rgba(99,102,241,0.3)'}
        strokeWidth="1.5"
      />
      {/* Horizon line */}
      <line x1="2" y1="16" x2="26" y2="16" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
      {/* Indicator dot */}
      <circle
        cx={Math.max(4, Math.min(24, indicatorX))}
        cy={Math.max(2, Math.min(16, indicatorY))}
        r="3"
        fill={color}
      />
      {/* Glow around indicator */}
      <circle
        cx={Math.max(4, Math.min(24, indicatorX))}
        cy={Math.max(2, Math.min(16, indicatorY))}
        r="5"
        fill={color}
        opacity="0.2"
      />
    </svg>
  );
}

// --- Selected Ant Panel ---
function SelectedAntPanel() {
  const selectedAntId = useGameStore(s => s.selectedAnt);
  const ants = useGameStore(s => s.ants);
  const setSelectedAnt = useGameStore(s => s.setSelectedAnt);

  if (!selectedAntId) return null;

  const ant = ants.find(a => a.id === selectedAntId);
  if (!ant || ant.state === 'dead') {
    return null;
  }

  const healthPct = (ant.health / ant.maxHealth) * 100;
  const hungerPct = Math.min(100, ant.hunger * 100);
  const fatiguePct = Math.min(100, ant.fatigue * 100);
  const expLevel = Math.floor(ant.experience / 50) + 1;
  const ageInDays = Math.round(ant.age / 600);

  return (
    <div className="absolute right-2 z-10 pointer-events-auto" style={{ top: '52px' }}>
      <div className="bg-black/85 backdrop-blur-md rounded-lg border border-amber-900/25 w-52 p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            {CASTE_ICONS[ant.caste]}
            <span className="text-amber-200 text-xs font-bold">{CASTE_NAMES[ant.caste]}</span>
          </div>
          <button
            onClick={() => setSelectedAnt(null)}
            className="text-amber-200/30 hover:text-amber-200 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Health Bar */}
        <div className="mb-1.5">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] text-amber-200/40 uppercase tracking-wider">Health</span>
            <span className="text-[9px] text-amber-200/50 font-mono">{Math.round(ant.health)}/{ant.maxHealth}</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                healthPct > 60 ? 'bg-emerald-500' : healthPct > 30 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${healthPct}%` }}
            />
          </div>
        </div>

        {/* Hunger Bar */}
        <div className="mb-1.5">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] text-amber-200/40 uppercase tracking-wider">Hunger</span>
            <span className="text-[9px] text-amber-200/50 font-mono">{Math.round(hungerPct)}%</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                hungerPct < 40 ? 'bg-emerald-500' : hungerPct < 70 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${hungerPct}%` }}
            />
          </div>
        </div>

        {/* Fatigue Bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] text-amber-200/40 uppercase tracking-wider">Fatigue</span>
            <span className="text-[9px] text-amber-200/50 font-mono">{Math.round(fatiguePct)}%</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                fatiguePct < 40 ? 'bg-blue-400' : fatiguePct < 70 ? 'bg-purple-400' : 'bg-red-400'
              }`}
              style={{ width: `${fatiguePct}%` }}
            />
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
          <div className="flex items-center gap-1">
            <Zap className="w-2.5 h-2.5 text-amber-400/60" />
            <span className="text-amber-200/40">State</span>
          </div>
          <span className={`text-right font-mono ${STATE_COLORS[ant.state]}`}>{STATE_LABELS[ant.state]}</span>

          <div className="flex items-center gap-1">
            <Clock className="w-2.5 h-2.5 text-amber-400/60" />
            <span className="text-amber-200/40">Age</span>
          </div>
          <span className="text-right font-mono text-amber-200/60">{ageInDays}d</span>

          <div className="flex items-center gap-1">
            <User className="w-2.5 h-2.5 text-amber-400/60" />
            <span className="text-amber-200/40">Personality</span>
          </div>
          <span className="text-right font-mono text-amber-200/60 capitalize">{ant.personality}</span>

          <div className="flex items-center gap-1">
            <Package className="w-2.5 h-2.5 text-amber-400/60" />
            <span className="text-amber-200/40">Carrying</span>
          </div>
          <span className="text-right font-mono text-amber-200/60">
            {ant.carrying ? `${ant.carryAmount.toFixed(1)}` : '—'}
          </span>

          <div className="flex items-center gap-1">
            <Star className="w-2.5 h-2.5 text-amber-400/60" />
            <span className="text-amber-200/40">Level</span>
          </div>
          <span className="text-right font-mono text-amber-200/60">{expLevel}</span>
        </div>
      </div>
    </div>
  );
}

// --- Main HUD ---
export function HUD() {
  const state = useGameStore();
  const { resources, ants, enemies, day, dayProgress, gamePhase, events, colonyMind, queenAlive, brood, currentTick, notifications, speed, paused, timeOfDay } = state;

  const livingAnts = ants.filter(a => a.state !== 'dead');
  const casteCounts: Record<string, number> = {};
  for (const a of livingAnts) {
    casteCounts[a.caste] = (casteCounts[a.caste] || 0) + 1;
  }
  const queen = livingAnts.find(a => a.caste === AntCaste.Queen);
  const queenHealth = queen?.health || 0;
  const queenMaxHealth = queen?.maxHealth || 1;

  return (
    <TooltipProvider delayDuration={200}>
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
        <div className="flex items-center gap-1 px-2 py-1.5 bg-black/80 backdrop-blur-md border-b border-amber-900/20 pointer-events-auto flex-wrap">
          {/* Day & Phase */}
          <div className="flex items-center gap-2 mr-2">
            <span className="text-amber-400 font-mono text-sm font-bold flex items-center gap-1">
              {timeOfDay > 0.25 && timeOfDay < 0.75
                ? <Sun className="w-3.5 h-3.5 text-amber-400" />
                : <Moon className="w-3.5 h-3.5 text-blue-300" />
              }
              Day {day}
            </span>
            <Badge className={`${PHASE_COLORS[gamePhase]} text-[10px] border`}>
              {gamePhase}
            </Badge>
            <span className="text-amber-200/30 text-[10px] font-mono flex items-center">
              {paused
                ? <Pause className="w-3 h-3" />
                : `${speed}x`
              }
            </span>
          </div>

          {/* Day Progress */}
          <div className="w-14 h-1.5 bg-gray-800 rounded-full overflow-hidden mr-1">
            <div
              className="h-full bg-amber-600/60 rounded-full transition-all duration-100"
              style={{ width: `${dayProgress * 100}%` }}
            />
          </div>

          {/* Day/Night Arc */}
          <DayNightArc timeOfDay={timeOfDay} />

          {/* Resources with category backgrounds */}
          {Object.entries(resources).map(([key, value]) => (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] hover:brightness-125 transition-all cursor-default ${RESOURCE_CATEGORY_BG[key] || 'bg-black/40'}`}>
                  {RESOURCE_ICONS[key]}
                  <span className={`font-mono ${value < 5 ? 'text-red-400' : value < 15 ? 'text-amber-400' : 'text-amber-200/80'}`}>
                    {Math.floor(value)}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">{RESOURCE_NAMES[key] || key}: {Math.floor(value)}</p>
              </TooltipContent>
            </Tooltip>
          ))}

          <div className="flex-1" />

          {/* Ant Stats */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] ${queenAlive ? 'bg-amber-900/30' : 'bg-red-900/40'}`}>
                  <Crown className={`w-3 h-3 ${queenAlive ? 'text-amber-400' : 'text-red-500'}`} />
                  <span className={queenAlive ? 'text-amber-300' : 'text-red-500'}>
                    {queenAlive ? `${Math.round(queenHealth)}` : <X className="w-3 h-3 inline" />}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Queen Health: {Math.round(queenHealth)}/{queenMaxHealth}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-black/40 rounded text-[11px]">
                  <Users className="w-3 h-3 text-amber-200/80" />
                  <span className="text-amber-200/80 font-mono">{livingAnts.length}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <div className="text-xs space-y-0.5">
                  {Object.entries(casteCounts).map(([caste, count]) => (
                    <p key={caste} className="flex items-center gap-1">
                      {CASTE_ICONS[caste as AntCaste]} {caste}: {count}
                    </p>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-black/40 rounded text-[11px]">
                  <Egg className="w-3 h-3 text-amber-200/80" />
                  <span className="text-amber-200/80 font-mono">{brood?.length || 0}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Brood: {brood?.length || 0}</p>
              </TooltipContent>
            </Tooltip>

            {enemies.length > 0 && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-red-900/50 rounded text-[11px] animate-pulse">
                <Skull className="w-3 h-3 text-red-300" />
                <span className="text-red-300 font-mono">{enemies.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Colony Mind Bar */}
      <div className="absolute top-10 right-2 z-10 pointer-events-none">
        <div className="bg-black/80 backdrop-blur-md rounded-lg p-2 border border-amber-900/20 pointer-events-auto w-44">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Colony Mind</span>
            <span className="text-[10px] text-amber-200/50 font-mono">{Math.round(colonyMind.consciousness)}%</span>
          </div>
          <Progress
            value={colonyMind.consciousness}
            className="h-2 bg-gray-800"
          />
        </div>
      </div>

      {/* Selected Ant Panel */}
      <SelectedAntPanel />

      {/* Active Events */}
      {events.length > 0 && (
        <div className="absolute top-10 left-2 z-10 pointer-events-none">
          <div className="flex flex-col gap-1 pointer-events-auto">
            {events.map((event, i) => {
              const info = EVENT_INFO[event.type];
              return (
                <div
                  key={i}
                  className="flex items-center gap-1.5 px-2 py-1 bg-black/80 rounded text-[10px] border border-red-900/30 backdrop-blur-sm"
                >
                  <AlertTriangle className="w-3 h-3 text-red-400 animate-pulse" />
                  <span style={{ color: info.color }} className="font-bold">{info.name}</span>
                  <div className="w-10 h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(event.timer / event.maxTimer) * 100}%`,
                        backgroundColor: info.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notifications */}
      <div className="absolute bottom-14 left-2 z-10 pointer-events-none max-w-xs">
        <div className="flex flex-col gap-0.5">
          {notifications.slice(-5).map((n) => {
            const age = currentTick - n.currentTick;
            const opacity = Math.max(0.2, 1 - age / 400);
            return (
              <div
                key={n.id}
                className={`text-[10px] px-2 py-0.5 rounded transition-opacity backdrop-blur-sm ${
                  n.type === 'danger' ? 'bg-red-900/70 text-red-300' :
                  n.type === 'warning' ? 'bg-amber-900/70 text-amber-300' :
                  n.type === 'success' ? 'bg-emerald-900/70 text-emerald-300' :
                  'bg-black/60 text-amber-200/50'
                }`}
                style={{ opacity }}
              >
                {n.message}
              </div>
            );
          })}
        </div>
      </div>

      {/* Hovered Cell Info */}
      {state.hoveredCell && (
        <div className="absolute bottom-14 right-2 z-10 pointer-events-none">
          <div className="text-[10px] px-2 py-1 bg-black/70 backdrop-blur-sm rounded border border-amber-900/20 text-amber-200/50 font-mono">
            [{state.hoveredCell.x}, {state.hoveredCell.y}]
          </div>
        </div>
      )}
    </TooltipProvider>
  );
}
