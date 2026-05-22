// ============================================================
// FerroNest - HUD (Heads-Up Display)
// ============================================================

'use client';

import { useGameStore } from '@/game/store';
import { CHAMBER_INFO, EVENT_INFO } from '@/game/constants';
import { AntCaste, GamePhase } from '@/game/types';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const RESOURCE_ICONS: Record<string, string> = {
  food: '🍎',
  protein: '🥩',
  sugar: '🍬',
  fungus: '🍄',
  water: '💧',
  pheromones: '🧪',
  biomass: '🧬',
  compactEarth: '🪨',
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
};

const PHASE_COLORS: Record<GamePhase, string> = {
  [GamePhase.Survival]: 'bg-red-900/70 text-red-300 border-red-800/50',
  [GamePhase.Expansion]: 'bg-amber-900/70 text-amber-300 border-amber-800/50',
  [GamePhase.Dominance]: 'bg-emerald-900/70 text-emerald-300 border-emerald-800/50',
  [GamePhase.Empire]: 'bg-purple-900/70 text-purple-300 border-purple-800/50',
};

export function HUD() {
  const state = useGameStore();
  const { resources, ants, enemies, day, dayProgress, gamePhase, events, colonyMind, queenAlive, brood, tick, notifications, speed, paused } = state;

  const livingAnts = ants.filter(a => a.state !== 'dead');
  const workerCount = livingAnts.filter(a => a.caste === AntCaste.Worker).length;
  const soldierCount = livingAnts.filter(a => a.caste === AntCaste.Soldier).length;
  const scoutCount = livingAnts.filter(a => a.caste === AntCaste.Scout).length;
  const nurseCount = livingAnts.filter(a => a.caste === AntCaste.Nurse).length;
  const queen = livingAnts.find(a => a.caste === AntCaste.Queen);
  const queenHealth = queen?.health || 0;
  const queenMaxHealth = queen?.maxHealth || 1;

  return (
    <TooltipProvider delayDuration={300}>
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
        <div className="flex items-center gap-1 px-2 py-1.5 bg-black/75 backdrop-blur-sm border-b border-amber-900/20 pointer-events-auto flex-wrap">
          {/* Day & Phase */}
          <div className="flex items-center gap-2 mr-2">
            <span className="text-amber-400 font-mono text-sm font-bold">Day {day}</span>
            <Badge className={`${PHASE_COLORS[gamePhase]} text-[10px] border`}>
              {gamePhase}
            </Badge>
            {/* Speed indicator */}
            <span className="text-amber-200/30 text-[10px] font-mono">
              {paused ? '⏸' : `${speed}x`}
            </span>
          </div>

          {/* Day Progress */}
          <div className="w-12 h-1 bg-gray-800 rounded-full overflow-hidden mr-1">
            <div
              className="h-full bg-amber-600/60 rounded-full transition-all duration-100"
              style={{ width: `${dayProgress * 100}%` }}
            />
          </div>

          {/* Resources */}
          {Object.entries(resources).map(([key, value]) => (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-0.5 px-1 py-0.5 bg-black/40 rounded text-[11px] hover:bg-black/60 transition-colors cursor-default">
                  <span className="text-xs">{RESOURCE_ICONS[key]}</span>
                  <span className={`font-mono ${value < 5 ? 'text-red-400' : value < 15 ? 'text-amber-400' : 'text-amber-200/80'}`}>
                    {Math.floor(value)}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">{RESOURCE_NAMES[key]}: {Math.floor(value)}</p>
              </TooltipContent>
            </Tooltip>
          ))}

          <div className="flex-1" />

          {/* Ant Stats */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] ${queenAlive ? 'bg-amber-900/30' : 'bg-red-900/40'}`}>
                  <span className="text-xs">♛</span>
                  <span className={queenAlive ? 'text-amber-300' : 'text-red-500'}>
                    {queenAlive ? '✓' : '✗'}
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
                  <span className="text-xs">🐜</span>
                  <span className="text-amber-200/80 font-mono">{livingAnts.length}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <div className="text-xs space-y-0.5">
                  <p>Workers: {workerCount}</p>
                  <p>Soldiers: {soldierCount}</p>
                  <p>Scouts: {scoutCount}</p>
                  <p>Nurses: {nurseCount}</p>
                </div>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-black/40 rounded text-[11px]">
                  <span className="text-xs">🥚</span>
                  <span className="text-amber-200/80 font-mono">{brood?.length || 0}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Brood: {brood?.length || 0}</p>
              </TooltipContent>
            </Tooltip>

            {enemies.length > 0 && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-red-900/50 rounded text-[11px] animate-pulse">
                <span className="text-xs">⚔️</span>
                <span className="text-red-300 font-mono">{enemies.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Colony Mind Bar */}
      <div className="absolute top-10 right-2 z-10 pointer-events-none">
        <div className="bg-black/75 backdrop-blur-sm rounded-lg p-2 border border-amber-900/20 pointer-events-auto w-40">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Colony Mind</span>
            <span className="text-[10px] text-amber-200/50 font-mono">{Math.round(colonyMind.consciousness)}%</span>
          </div>
          <Progress
            value={colonyMind.consciousness}
            className="h-1.5 bg-gray-800"
          />
        </div>
      </div>

      {/* Active Events */}
      {events.length > 0 && (
        <div className="absolute top-10 left-2 z-10 pointer-events-none">
          <div className="flex flex-col gap-1 pointer-events-auto">
            {events.map((event, i) => {
              const info = EVENT_INFO[event.type];
              return (
                <div
                  key={i}
                  className="flex items-center gap-1.5 px-2 py-1 bg-black/80 rounded text-[10px] border border-red-900/30"
                >
                  <span className="text-red-400 animate-pulse">⚠</span>
                  <span style={{ color: info.color }} className="font-bold">{info.name}</span>
                  <div className="w-8 h-1 bg-gray-700 rounded-full overflow-hidden">
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
          {notifications.slice(-4).map((n) => {
            const age = tick - n.tick;
            const opacity = Math.max(0.3, 1 - age / 300);
            return (
              <div
                key={n.id}
                className={`text-[10px] px-2 py-0.5 rounded transition-opacity ${
                  n.type === 'danger' ? 'bg-red-900/70 text-red-300' :
                  n.type === 'warning' ? 'bg-amber-900/70 text-amber-300' :
                  n.type === 'success' ? 'bg-emerald-900/70 text-emerald-300' :
                  'bg-black/50 text-amber-200/50'
                }`}
                style={{ opacity }}
              >
                {n.message}
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
