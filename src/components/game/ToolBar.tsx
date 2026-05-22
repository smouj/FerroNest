// ============================================================
// FerroNest - Tool Bar Component (Professional Edition v2)
// ============================================================

'use client';

import { useGameStore } from '@/game/store';
import { CHAMBER_INFO, PHEROMONE_COLORS, PHEROMONE_NAMES, MIND_ABILITIES } from '@/game/constants';
import { GameTool, ChamberType, PheromoneType, MindAbilityType } from '@/game/types';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import {
  Hammer,
  Building2,
  Pen,
  Target,
  LogOut,
  Shield,
  Maximize2,
  MousePointer2,
  Play,
  Pause,
  Eye,
  Map,
  Square,
  Hexagon,
  Sparkles,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useState, useCallback } from 'react';
import { useUIStore } from '@/game/ui-store';
import { isAudioInitialized, getMasterVolume, setMasterVolume as setAudioMasterVolume, playSound } from '@/game/audio';

// --- Tool Definitions with Categories ---
type ToolCategory = 'actions' | 'pheromones' | 'other';

interface ToolDef {
  tool: GameTool;
  icon: ReactNode;
  label: string;
  desc: string;
  shortcut: string;
  category: ToolCategory;
}

const TOOLS: ToolDef[] = [
  { tool: GameTool.Excavate, icon: <Hammer className="w-3.5 h-3.5" />, label: 'Dig', desc: 'Excavate tunnels (drag to paint)', shortcut: '1', category: 'actions' },
  { tool: GameTool.BuildChamber, icon: <Building2 className="w-3.5 h-3.5" />, label: 'Build', desc: 'Place a chamber', shortcut: '2', category: 'actions' },
  { tool: GameTool.MarkPheromone, icon: <Pen className="w-3.5 h-3.5" />, label: 'Mark', desc: 'Paint pheromone trails (drag)', shortcut: '3', category: 'pheromones' },
  { tool: GameTool.Prioritize, icon: <Target className="w-3.5 h-3.5" />, label: 'Focus', desc: 'High priority zone', shortcut: '4', category: 'pheromones' },
  { tool: GameTool.Evacuate, icon: <LogOut className="w-3.5 h-3.5" />, label: 'Evac', desc: 'Evacuation pheromone', shortcut: '5', category: 'pheromones' },
  { tool: GameTool.Defend, icon: <Shield className="w-3.5 h-3.5" />, label: 'Defend', desc: 'Defense pheromone', shortcut: '6', category: 'pheromones' },
  { tool: GameTool.Expand, icon: <Maximize2 className="w-3.5 h-3.5" />, label: 'Expand', desc: 'Excavate large area', shortcut: '7', category: 'other' },
  { tool: GameTool.Select, icon: <MousePointer2 className="w-3.5 h-3.5" />, label: 'Select', desc: 'Select an ant', shortcut: '8', category: 'other' },
];

const CATEGORY_LABELS: Record<ToolCategory, string> = {
  actions: 'Actions',
  pheromones: 'Pheromones',
  other: 'Other',
};

const CATEGORY_COLORS: Record<ToolCategory, string> = {
  actions: 'text-amber-500',
  pheromones: 'text-purple-500',
  other: 'text-gray-500',
};

const CHAMBERS = Object.values(ChamberType);
const PHEROMONES = Object.values(PheromoneType);

export function ToolBar() {
  const selectedTool = useGameStore(s => s.selectedTool);
  const selectedChamberType = useGameStore(s => s.selectedChamberType);
  const selectedPheromoneType = useGameStore(s => s.selectedPheromoneType);
  const showPheromoneView = useGameStore(s => s.showPheromoneView);
  const showMinimap = useGameStore(s => s.showMinimap);
  const resources = useGameStore(s => s.resources);
  const colonyMind = useGameStore(s => s.colonyMind);
  const paused = useGameStore(s => s.paused);
  const speed = useGameStore(s => s.speed);

  const setTool = useGameStore(s => s.setTool);
  const setChamberType = useGameStore(s => s.setChamberType);
  const setPheromoneType = useGameStore(s => s.setPheromoneType);
  const togglePheromoneView = useGameStore(s => s.togglePheromoneView);
  const toggleMinimap = useGameStore(s => s.toggleMinimap);
  const activateMind = useGameStore(s => s.activateMind);
  const togglePaused = useGameStore(s => s.togglePaused);
  const changeSpeed = useGameStore(s => s.changeSpeed);

  const setSettingsOpen = useUIStore(s => s.setSettingsOpen);

  // Sound state
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(() => isAudioInitialized() ? getMasterVolume() : 0.5);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      setAudioMasterVolume(volume);
      setIsMuted(false);
    } else {
      setAudioMasterVolume(0);
      setIsMuted(true);
    }
    playSound('button_click');
  }, [isMuted, volume]);

  const handleVolumeChange = useCallback((v: number) => {
    setVolume(v);
    setAudioMasterVolume(v);
    if (v > 0 && isMuted) setIsMuted(false);
    if (v === 0) setIsMuted(true);
  }, [isMuted]);

  // Group tools by category
  const categories: ToolCategory[] = ['actions', 'pheromones', 'other'];
  const toolsByCategory = categories.map(cat => ({
    category: cat,
    tools: TOOLS.filter(t => t.category === cat),
  }));

  return (
    <TooltipProvider delayDuration={200}>
      <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none">
        <div className="bg-black/85 backdrop-blur-md border-t border-amber-900/20 pointer-events-auto">
          <div className="flex items-center gap-1 px-2 py-1.5 overflow-x-auto">
            {/* Game Controls */}
            <div className="flex items-center gap-0.5 mr-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={paused ? 'destructive' : 'outline'}
                    size="sm"
                    className="h-7 w-7 p-0 text-[10px] border-amber-900/30"
                    onClick={togglePaused}
                  >
                    {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Pause/Resume (Space)</TooltipContent>
              </Tooltip>

              {[1, 2, 3].map(s => (
                <Tooltip key={s}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={speed === s ? 'default' : 'outline'}
                      size="sm"
                      className={`h-7 w-7 p-0 text-[10px] ${speed === s ? 'bg-amber-700 hover:bg-amber-600' : 'border-amber-900/30 text-amber-300/60'}`}
                      onClick={() => changeSpeed(s)}
                    >
                      {s}x
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{s}x Speed ({s})</TooltipContent>
                </Tooltip>
              ))}
            </div>

            <Separator orientation="vertical" className="h-6 bg-amber-900/20 mx-0.5" />

            {/* Tool Categories */}
            {toolsByCategory.map(({ category, tools }, catIdx) => (
              <div key={category} className="flex items-center gap-0.5 mx-0.5">
                {catIdx > 0 && (
                  <Separator orientation="vertical" className="h-6 bg-amber-900/15 mr-0.5" />
                )}
                {/* Category label */}
                <span className={`text-[8px] uppercase tracking-wider font-bold ${CATEGORY_COLORS[category]} hidden lg:block mr-0.5`}>
                  {CATEGORY_LABELS[category]}
                </span>
                {tools.map(({ tool, icon, label, desc, shortcut }) => {
                  const isActive = selectedTool === tool;
                  return (
                    <Tooltip key={tool}>
                      <TooltipTrigger asChild>
                        <Button
                          variant={isActive ? 'default' : 'ghost'}
                          size="sm"
                          className={`h-7 px-1.5 text-[10px] relative transition-all ${
                            isActive
                              ? 'bg-amber-700 hover:bg-amber-600 text-amber-100 shadow-[0_0_8px_rgba(180,83,9,0.5)] ring-1 ring-amber-500/50'
                              : 'text-amber-300/50 hover:text-amber-200 hover:bg-amber-900/20'
                          }`}
                          onClick={() => setTool(tool)}
                        >
                          <span className="mr-0.5 flex items-center">{icon}</span>
                          <span className="hidden sm:inline">{label}</span>
                          {/* Keyboard shortcut badge */}
                          <span className={`absolute -top-1 -right-0.5 text-[7px] font-bold px-0.5 rounded ${
                            isActive
                              ? 'bg-amber-500 text-black'
                              : 'bg-amber-900/40 text-amber-400/60'
                          }`}>
                            {shortcut}
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-bold text-xs">{label}</p>
                        <p className="text-[10px] text-muted-foreground">{desc}</p>
                        <p className="text-[10px] text-amber-400 font-bold">Key: {shortcut}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}

            {/* Context Panel - Chamber Selection */}
            {selectedTool === GameTool.BuildChamber && (
              <>
                <Separator orientation="vertical" className="h-6 bg-amber-900/20 mx-0.5" />
                <div className="flex items-center gap-0.5 mx-0.5 overflow-x-auto">
                  {CHAMBERS.map((type) => {
                    const info = CHAMBER_INFO[type];
                    const canAffordEarth = resources.compactEarth >= info.cost.compactEarth;
                    const canAffordBiomass = resources.biomass >= info.cost.biomass;
                    const canAfford = canAffordEarth && canAffordBiomass;
                    return (
                      <Tooltip key={type}>
                        <TooltipTrigger asChild>
                          <Button
                            variant={selectedChamberType === type ? 'default' : 'ghost'}
                            size="sm"
                            className={`h-7 px-1.5 text-[10px] ${!canAfford ? 'opacity-30' : ''} ${
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
                        <TooltipContent className="max-w-[200px]">
                          <p className="font-bold text-xs">{info.name}</p>
                          <p className="text-[10px] text-muted-foreground">{info.description}</p>
                          <div className="flex items-center gap-2 mt-1 text-[10px]">
                            <span className={`flex items-center gap-0.5 ${canAffordEarth ? 'text-amber-400' : 'text-red-400'}`}>
                              <Square className="w-2.5 h-2.5" />
                              {info.cost.compactEarth}
                              {!canAffordEarth && ' ✗'}
                            </span>
                            <span className={`flex items-center gap-0.5 ${canAffordBiomass ? 'text-emerald-400' : 'text-red-400'}`}>
                              <Hexagon className="w-2.5 h-2.5" />
                              {info.cost.biomass}
                              {!canAffordBiomass && ' ✗'}
                            </span>
                          </div>
                          <p className="text-[10px] text-emerald-400 mt-0.5">{info.effect}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </>
            )}

            {/* Context Panel - Pheromone Selection */}
            {(selectedTool === GameTool.MarkPheromone || selectedTool === GameTool.Defend ||
              selectedTool === GameTool.Evacuate || selectedTool === GameTool.Prioritize) && (
              <>
                <Separator orientation="vertical" className="h-6 bg-amber-900/20 mx-0.5" />
                <div className="flex items-center gap-0.5 mx-0.5">
                  {PHEROMONES.map((type) => (
                    <Tooltip key={type}>
                      <TooltipTrigger asChild>
                        <Button
                          variant={selectedPheromoneType === type ? 'default' : 'ghost'}
                          size="sm"
                          className="h-7 px-1.5 text-[10px]"
                          style={{
                            color: selectedPheromoneType === type ? '#fff' : PHEROMONE_COLORS[type],
                            backgroundColor: selectedPheromoneType === type ? PHEROMONE_COLORS[type] + '50' : 'transparent',
                            borderColor: PHEROMONE_COLORS[type] + '60',
                          }}
                          onClick={() => setPheromoneType(type)}
                        >
                          <span className="hidden sm:inline">{PHEROMONE_NAMES[type]}</span>
                          <span className="sm:hidden w-2 h-2 rounded-full" style={{ backgroundColor: PHEROMONE_COLORS[type] }} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{PHEROMONE_NAMES[type]} Pheromone</TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </>
            )}

            <div className="flex-1" />

            {/* View Toggles */}
            <div className="flex items-center gap-0.5 mr-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showPheromoneView ? 'default' : 'ghost'}
                    size="sm"
                    className={`h-7 px-1.5 text-[10px] gap-0.5 ${showPheromoneView ? 'bg-purple-800 text-purple-100' : 'text-purple-400/50'}`}
                    onClick={togglePheromoneView}
                  >
                    <Eye className="w-3 h-3" /> Phero
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Pheromone View (P)</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showMinimap ? 'default' : 'ghost'}
                    size="sm"
                    className={`h-7 px-1.5 text-[10px] gap-0.5 ${showMinimap ? 'bg-amber-800 text-amber-100' : 'text-amber-400/50'}`}
                    onClick={toggleMinimap}
                  >
                    <Map className="w-3 h-3" /> Map
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Minimap (M)</TooltipContent>
              </Tooltip>

              {/* Settings button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-amber-400/50 hover:text-amber-200"
                    onClick={() => setSettingsOpen(true)}
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Settings (Esc)</TooltipContent>
              </Tooltip>

              {/* Sound Controls */}
              <div className="relative flex items-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-7 w-7 p-0 ${isMuted ? 'text-red-400/70' : 'text-amber-400/50'} hover:text-amber-200`}
                      onClick={toggleMute}
                      onMouseEnter={() => setShowVolumeSlider(true)}
                    >
                      {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isMuted ? 'Unmute' : 'Mute'}</TooltipContent>
                </Tooltip>

                {/* Volume slider popup */}
                {showVolumeSlider && (
                  <div
                    className="absolute bottom-full mb-1 right-0 bg-black/90 border border-amber-900/30 rounded px-2 py-1.5 flex items-center gap-1.5 z-50"
                    onMouseLeave={() => setShowVolumeSlider(false)}
                  >
                    <Volume2 className="w-3 h-3 text-amber-400/60" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-16 h-1 accent-amber-500 cursor-pointer"
                    />
                    <span className="text-[8px] text-amber-400/60 w-5">{Math.round((isMuted ? 0 : volume) * 100)}%</span>
                  </div>
                )}
              </div>
            </div>

            <Separator orientation="vertical" className="h-6 bg-amber-900/20 mx-0.5" />

            {/* Mind Abilities */}
            <div className="flex items-center gap-0.5">
              {colonyMind.abilities.map((ability) => {
                const info = MIND_ABILITIES[ability.type];
                const canUse = colonyMind.consciousness >= ability.cost && ability.currentCooldown <= 0;
                return (
                  <Tooltip key={ability.type}>
                    <TooltipTrigger asChild>
                      <Button
                        variant={ability.active ? 'default' : 'ghost'}
                        size="sm"
                        className={`h-7 px-1.5 text-[10px] ${
                          ability.active ? 'bg-purple-700 text-purple-100 animate-pulse' :
                          !canUse ? 'opacity-30 text-purple-400/50' :
                          'text-purple-400/70 hover:text-purple-300'
                        }`}
                        onClick={() => canUse && activateMind(ability.type)}
                        disabled={!canUse}
                      >
                        {ability.active ? <Sparkles className="w-3 h-3 mr-0.5" /> : null}{info.name.split(' ')[0]}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-bold text-xs">{info.name}</p>
                      <p className="text-[10px] text-muted-foreground">{info.description}</p>
                      <p className="text-[10px] text-purple-400">Cost: {ability.cost} consciousness</p>
                      {ability.currentCooldown > 0 && (
                        <p className="text-[10px] text-amber-400">Cooldown: {Math.ceil(ability.currentCooldown / 30)}s</p>
                      )}
                      {ability.active && (
                        <p className="text-[10px] text-emerald-400">Active: {Math.ceil(ability.remainingDuration / 30)}s</p>
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
