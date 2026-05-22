// ============================================================
// FerroNest - Settings Panel (Esc overlay)
// ============================================================

'use client';

import { useUIStore, type MinimapPosition } from '@/game/ui-store';
import { useGameStore } from '@/game/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Volume2,
  Camera,
  Monitor,
  Crown,
  Play,
  RotateCcw,
  X,
} from 'lucide-react';

export function SettingsPanel() {
  const settingsOpen = useUIStore(s => s.settingsOpen);
  const setSettingsOpen = useUIStore(s => s.setSettingsOpen);

  const difficulty = useUIStore(s => s.difficulty);
  const masterVolume = useUIStore(s => s.masterVolume);
  const sfxVolume = useUIStore(s => s.sfxVolume);
  const ambientVolume = useUIStore(s => s.ambientVolume);
  const cameraSmoothPanning = useUIStore(s => s.cameraSmoothPanning);
  const autoFollowQueen = useUIStore(s => s.autoFollowQueen);
  const showFpsCounter = useUIStore(s => s.showFpsCounter);
  const minimapPosition = useUIStore(s => s.minimapPosition);

  const setMasterVolume = useUIStore(s => s.setMasterVolume);
  const setSfxVolume = useUIStore(s => s.setSfxVolume);
  const setAmbientVolume = useUIStore(s => s.setAmbientVolume);
  const setCameraSmoothPanning = useUIStore(s => s.setCameraSmoothPanning);
  const setAutoFollowQueen = useUIStore(s => s.setAutoFollowQueen);
  const setShowFpsCounter = useUIStore(s => s.setShowFpsCounter);
  const setMinimapPosition = useUIStore(s => s.setMinimapPosition);

  const init = useGameStore(s => s.init);

  if (!settingsOpen) return null;

  const difficultyColors: Record<string, string> = {
    easy: 'text-emerald-400',
    normal: 'text-amber-400',
    hard: 'text-red-400',
  };

  const handleResume = () => setSettingsOpen(false);

  const handleNewColony = () => {
    setSettingsOpen(false);
    init();
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4 bg-black/90 border-amber-900/30 shadow-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-amber-400 text-lg">Settings</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-amber-200/40 hover:text-amber-200"
              onClick={handleResume}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Audio */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Volume2 className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">Audio</span>
            </div>
            <div className="space-y-3 pl-5">
              <div className="flex items-center gap-3">
                <Label className="text-amber-200/50 text-xs w-20 shrink-0">Master</Label>
                <Slider
                  value={[masterVolume]}
                  onValueChange={([v]) => setMasterVolume(v)}
                  min={0}
                  max={100}
                  step={5}
                  className="flex-1"
                />
                <span className="text-amber-200/40 text-[10px] font-mono w-7 text-right">{masterVolume}</span>
              </div>
              <div className="flex items-center gap-3">
                <Label className="text-amber-200/50 text-xs w-20 shrink-0">SFX</Label>
                <Slider
                  value={[sfxVolume]}
                  onValueChange={([v]) => setSfxVolume(v)}
                  min={0}
                  max={100}
                  step={5}
                  className="flex-1"
                />
                <span className="text-amber-200/40 text-[10px] font-mono w-7 text-right">{sfxVolume}</span>
              </div>
              <div className="flex items-center gap-3">
                <Label className="text-amber-200/50 text-xs w-20 shrink-0">Ambient</Label>
                <Slider
                  value={[ambientVolume]}
                  onValueChange={([v]) => setAmbientVolume(v)}
                  min={0}
                  max={100}
                  step={5}
                  className="flex-1"
                />
                <span className="text-amber-200/40 text-[10px] font-mono w-7 text-right">{ambientVolume}</span>
              </div>
            </div>
          </div>

          <Separator className="bg-amber-900/20" />

          {/* Camera */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Camera className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">Camera</span>
            </div>
            <div className="space-y-3 pl-5">
              <div className="flex items-center justify-between">
                <Label className="text-amber-200/50 text-xs">Smooth Panning</Label>
                <Switch
                  checked={cameraSmoothPanning}
                  onCheckedChange={setCameraSmoothPanning}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-amber-200/50 text-xs">Auto-follow Queen</Label>
                <Switch
                  checked={autoFollowQueen}
                  onCheckedChange={setAutoFollowQueen}
                />
              </div>
            </div>
          </div>

          <Separator className="bg-amber-900/20" />

          {/* Display */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Monitor className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">Display</span>
            </div>
            <div className="space-y-3 pl-5">
              <div className="flex items-center justify-between">
                <Label className="text-amber-200/50 text-xs">Show FPS Counter</Label>
                <Switch
                  checked={showFpsCounter}
                  onCheckedChange={setShowFpsCounter}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-amber-200/50 text-xs">Minimap Position</Label>
                <div className="flex gap-1">
                  {(['bottom-right', 'top-right'] as MinimapPosition[]).map((pos) => (
                    <Button
                      key={pos}
                      variant={minimapPosition === pos ? 'default' : 'ghost'}
                      size="sm"
                      className={`h-6 px-2 text-[10px] ${
                        minimapPosition === pos ? 'bg-amber-700 hover:bg-amber-600 text-white' : 'text-amber-200/40'
                      }`}
                      onClick={() => setMinimapPosition(pos)}
                    >
                      {pos === 'bottom-right' ? 'Bottom' : 'Top'}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Separator className="bg-amber-900/20" />

          {/* Difficulty (read-only) */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">Difficulty</span>
            </div>
            <div className="pl-5">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold capitalize ${difficultyColors[difficulty]}`}>{difficulty}</span>
                <span className="text-amber-200/20 text-[10px]">(set at game start)</span>
              </div>
            </div>
          </div>

          <Separator className="bg-amber-900/20" />

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              className="flex-1 bg-amber-700 hover:bg-amber-600 text-amber-100 font-bold"
              onClick={handleResume}
            >
              <Play className="w-4 h-4 mr-2" />
              Resume
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-red-900/40 text-red-400 hover:bg-red-900/20 hover:text-red-300 font-bold"
              onClick={handleNewColony}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              New Colony
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
