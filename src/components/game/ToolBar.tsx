// ============================================================
// FerroNest - Tool Bar Component
// ============================================================

'use client';

import { useGameStore } from '@/game/store';
import { CHAMBER_INFO, PHEROMONE_COLORS, MIND_ABILITIES } from '@/game/constants';
import { GameTool, ChamberType, PheromoneType, MindAbilityType } from '@/game/types';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

const TOOLS: { tool: GameTool; icon: string; label: string; desc: string }[] = [
  { tool: GameTool.Excavate, icon: '⛏', label: 'Dig', desc: 'Excavate tunnels' },
  { tool: GameTool.BuildChamber, icon: '🏗', label: 'Build', desc: 'Place a chamber' },
  { tool: GameTool.MarkPheromone, icon: '🧪', label: 'Mark', desc: 'Mark pheromone trails' },
  { tool: GameTool.Prioritize, icon: '⭐', label: 'Focus', desc: 'High priority zone' },
  { tool: GameTool.Evacuate, icon: '🚨', label: 'Evac', desc: 'Evacuation pheromone' },
  { tool: GameTool.Defend, icon: '🛡', label: 'Defend', desc: 'Defense pheromone' },
  { tool: GameTool.Expand, icon: '↗', label: 'Expand', desc: 'Excavate large area' },
];

const CHAMBERS = Object.values(ChamberType);
const PHEROMONES = Object.values(PheromoneType);

const PHEROMONE_NAMES: Record<PheromoneType, string> = {
  [PheromoneType.Collect]: 'Collect',
  [PheromoneType.Excavate]: 'Dig',
  [PheromoneType.Defend]: 'Defend',
  [PheromoneType.Evacuate]: 'Evac',
  [PheromoneType.Explore]: 'Explore',
  [PheromoneType.Attack]: 'Attack',
  [PheromoneType.HighPriority]: 'Priority',
};

export function ToolBar() {
  const selectedTool = useGameStore(s => s.selectedTool);
  const selectedChamberType = useGameStore(s => s.selectedChamberType);
  const selectedPheromoneType = useGameStore(s => s.selectedPheromoneType);
  const showPheromoneView = useGameStore(s => s.showPheromoneView);
  const resources = useGameStore(s => s.resources);
  const colonyMind = useGameStore(s => s.colonyMind);
  const paused = useGameStore(s => s.paused);
  const speed = useGameStore(s => s.speed);

  const setTool = useGameStore(s => s.setTool);
  const setChamberType = useGameStore(s => s.setChamberType);
  const setPheromoneType = useGameStore(s => s.setPheromoneType);
  const togglePheromoneView = useGameStore(s => s.togglePheromoneView);
  const activateMind = useGameStore(s => s.activateMind);
  const togglePaused = useGameStore(s => s.togglePaused);
  const changeSpeed = useGameStore(s => s.changeSpeed);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none">
        <div className="bg-black/80 backdrop-blur-sm border-t border-amber-900/20 pointer-events-auto">
          <div className="flex items-center gap-1 px-2 py-1.5 overflow-x-auto">
            {/* Game Controls */}
            <div className="flex items-center gap-0.5 mr-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={paused ? 'destructive' : 'outline'}
                    size="sm"
                    className="h-6 w-6 p-0 text-[10px] border-amber-900/30"
                    onClick={togglePaused}
                  >
                    {paused ? '▶' : '⏸'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Pause/Resume</TooltipContent>
              </Tooltip>

              {[1, 2, 3].map(s => (
                <Tooltip key={s}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={speed === s ? 'default' : 'outline'}
                      size="sm"
                      className={`h-6 w-6 p-0 text-[10px] ${speed === s ? 'bg-amber-700 hover:bg-amber-600' : 'border-amber-900/30 text-amber-300/60'}`}
                      onClick={() => changeSpeed(s)}
                    >
                      {s}x
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{s}x Speed</TooltipContent>
                </Tooltip>
              ))}
            </div>

            <Separator orientation="vertical" className="h-5 bg-amber-900/20 mx-0.5" />

            {/* Tools */}
            <div className="flex items-center gap-0.5 mx-0.5">
              {TOOLS.map(({ tool, icon, label, desc }) => (
                <Tooltip key={tool}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={selectedTool === tool ? 'default' : 'ghost'}
                      size="sm"
                      className={`h-6 px-1.5 text-[10px] ${
                        selectedTool === tool
                          ? 'bg-amber-700 hover:bg-amber-600 text-amber-100'
                          : 'text-amber-300/50 hover:text-amber-200 hover:bg-amber-900/20'
                      }`}
                      onClick={() => setTool(tool)}
                    >
                      <span className="mr-0.5">{icon}</span>
                      <span className="hidden sm:inline">{label}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-bold text-xs">{label}</p>
                    <p className="text-[10px] text-muted-foreground">{desc}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>

            {/* Context Panel */}
            {selectedTool === GameTool.BuildChamber && (
              <>
                <Separator orientation="vertical" className="h-5 bg-amber-900/20 mx-0.5" />
                <div className="flex items-center gap-0.5 mx-0.5 overflow-x-auto">
                  {CHAMBERS.map((type) => {
                    const info = CHAMBER_INFO[type];
                    const canAfford = resources.compactEarth >= info.cost.compactEarth && resources.biomass >= info.cost.biomass;
                    return (
                      <Tooltip key={type}>
                        <TooltipTrigger asChild>
                          <Button
                            variant={selectedChamberType === type ? 'default' : 'ghost'}
                            size="sm"
                            className={`h-6 px-1.5 text-[10px] ${!canAfford ? 'opacity-30' : ''} ${
                              selectedChamberType === type ? 'text-white' : 'text-amber-300/50'
                            }`}
                            style={selectedChamberType === type ? { backgroundColor: info.color + '80' } : {}}
                            onClick={() => canAfford && setChamberType(type)}
                            disabled={!canAfford}
                          >
                            <span className="mr-0.5">{info.icon}</span>
                            <span className="hidden md:inline">{info.name.split(' ')[0]}</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-bold text-xs">{info.name}</p>
                          <p className="text-[10px] text-muted-foreground">{info.description}</p>
                          <p className="text-[10px] text-amber-400">
                            {info.cost.compactEarth}🪨 {info.cost.biomass}🧬
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </>
            )}

            {(selectedTool === GameTool.MarkPheromone || selectedTool === GameTool.Defend || selectedTool === GameTool.Evacuate || selectedTool === GameTool.Prioritize) && (
              <>
                <Separator orientation="vertical" className="h-5 bg-amber-900/20 mx-0.5" />
                <div className="flex items-center gap-0.5 mx-0.5">
                  {PHEROMONES.map((type) => (
                    <Tooltip key={type}>
                      <TooltipTrigger asChild>
                        <Button
                          variant={selectedPheromoneType === type ? 'default' : 'ghost'}
                          size="sm"
                          className="h-6 px-1.5 text-[10px]"
                          style={{
                            color: selectedPheromoneType === type ? '#fff' : PHEROMONE_COLORS[type],
                            backgroundColor: selectedPheromoneType === type ? PHEROMONE_COLORS[type] + '50' : 'transparent',
                            borderColor: PHEROMONE_COLORS[type] + '60',
                          }}
                          onClick={() => setPheromoneType(type)}
                        >
                          <span className="hidden sm:inline">{PHEROMONE_NAMES[type]}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{PHEROMONE_NAMES[type]} Pheromone</TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </>
            )}

            <div className="flex-1" />

            {/* Pheromone View Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showPheromoneView ? 'default' : 'ghost'}
                  size="sm"
                  className={`h-6 px-1.5 text-[10px] ${showPheromoneView ? 'bg-purple-800 text-purple-100' : 'text-purple-400/50'}`}
                  onClick={togglePheromoneView}
                >
                  🧪 View
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle Pheromone View</TooltipContent>
            </Tooltip>

            {/* Mind Abilities */}
            <div className="flex items-center gap-0.5 ml-0.5">
              {colonyMind.abilities.map((ability) => {
                const info = MIND_ABILITIES[ability.type];
                const canUse = colonyMind.consciousness >= ability.cost && ability.currentCooldown <= 0;
                return (
                  <Tooltip key={ability.type}>
                    <TooltipTrigger asChild>
                      <Button
                        variant={ability.active ? 'default' : 'ghost'}
                        size="sm"
                        className={`h-6 px-1.5 text-[10px] ${
                          ability.active ? 'bg-purple-700 text-purple-100 animate-pulse' :
                          !canUse ? 'opacity-30 text-purple-400/50' :
                          'text-purple-400/70 hover:text-purple-300'
                        }`}
                        onClick={() => canUse && activateMind(ability.type)}
                        disabled={!canUse}
                      >
                        {ability.active ? '⚡' : ''}{info.name.split(' ')[0]}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-bold text-xs">{info.name}</p>
                      <p className="text-[10px] text-muted-foreground">{info.description}</p>
                      <p className="text-[10px] text-purple-400">Cost: {ability.cost} consciousness</p>
                      {ability.currentCooldown > 0 && (
                        <p className="text-[10px] text-amber-400">Cooldown: {Math.ceil(ability.currentCooldown / 30)}s</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
