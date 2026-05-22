// ============================================================
// FerroNest - Main Page (Professional Edition)
// ============================================================

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { GameCanvas } from '@/components/game/GameCanvas';
import { HUD } from '@/components/game/HUD';
import { ToolBar } from '@/components/game/ToolBar';
import { useGameStore } from '@/game/store';

function GameOverScreen() {
  const day = useGameStore(s => s.day);
  const totalHatched = useGameStore(s => s.totalAntsHatched);
  const totalLost = useGameStore(s => s.totalAntsLost);
  const init = useGameStore(s => s.init);
  const gamePhase = useGameStore(s => s.gamePhase);
  const colonyScore = useGameStore(s => s.colonyScore);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
      <div className="text-center p-8 rounded-xl border border-red-900/50 bg-black/80 max-w-md">
        <h2 className="text-4xl font-bold text-red-500 mb-2">Colony Lost</h2>
        <p className="text-amber-200/40 text-sm mb-6">The queen has fallen. The colony cannot survive without her.</p>
        <div className="grid grid-cols-2 gap-3 mb-6 text-center">
          <div>
            <div className="text-2xl font-bold text-amber-400">{day}</div>
            <div className="text-xs text-amber-200/60">Days Survived</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-300">{colonyScore}</div>
            <div className="text-xs text-amber-200/60">Colony Score</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-400">{totalHatched}</div>
            <div className="text-xs text-amber-200/60">Ants Hatched</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-400">{totalLost}</div>
            <div className="text-xs text-amber-200/60">Ants Lost</div>
          </div>
        </div>
        <div className="mb-4 text-sm text-purple-300/60">Peak Phase: <span className="capitalize font-bold">{gamePhase}</span></div>
        <button
          onClick={init}
          className="px-6 py-3 bg-amber-700 hover:bg-amber-600 text-amber-100 font-bold rounded-lg transition-colors"
        >
          New Colony
        </button>
      </div>
    </div>
  );
}

function IntroScreen({ onStart }: { onStart: () => void }) {
  const [fadeState, setFadeState] = useState<'in' | 'visible' | 'out'>('in');

  useEffect(() => {
    const timer = setTimeout(() => setFadeState('visible'), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleStart = () => {
    setFadeState('out');
    setTimeout(onStart, 400);
  };

  return (
    <div className={`absolute inset-0 z-50 flex items-center justify-center bg-[#050505] overflow-auto transition-opacity duration-400 ${
      fadeState === 'in' ? 'opacity-0' : fadeState === 'out' ? 'opacity-0' : 'opacity-100'
    }`}>
      <div className="text-center max-w-lg px-6 py-8">
        {/* Title */}
        <div className="mb-2 relative">
          <div className="absolute inset-0 bg-amber-500/5 blur-3xl rounded-full" />
          <span className="text-7xl font-bold tracking-tight bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 bg-clip-text text-transparent relative">
            FerroNest
          </span>
        </div>
        <p className="text-amber-200/25 text-xs mb-8 tracking-[0.4em] uppercase font-light">
          Build the colony &middot; Mark the trails &middot; Protect the queen
        </p>

        {/* Description */}
        <div className="bg-black/60 rounded-xl p-6 border border-amber-900/15 mb-6 text-left">
          <p className="text-amber-200/60 text-sm leading-relaxed mb-3">
            You don&apos;t control ants. You control a <span className="text-amber-400 font-semibold">collective mind</span>.
          </p>
          <p className="text-amber-200/40 text-sm leading-relaxed mb-4">
            Dig tunnels, organize routes through <span className="text-purple-400 font-semibold">pheromones</span>, raise new castes,
            cultivate fungus gardens, and defend your queen against rain, predators, and rival colonies.
          </p>
          <div className="grid grid-cols-3 gap-2 text-xs text-amber-200/35 mt-4">
            <div className="flex items-center gap-1.5"><span className="text-amber-600">⛏</span> Excavate tunnels</div>
            <div className="flex items-center gap-1.5"><span className="text-amber-600">◈</span> Build chambers</div>
            <div className="flex items-center gap-1.5"><span className="text-purple-600">◈</span> Mark pheromones</div>
            <div className="flex items-center gap-1.5"><span className="text-red-600">♦</span> Defend the queen</div>
            <div className="flex items-center gap-1.5"><span className="text-pink-600">◎</span> Raise brood</div>
            <div className="flex items-center gap-1.5"><span className="text-emerald-600">⚔</span> Fight enemies</div>
            <div className="flex items-center gap-1.5"><span className="text-emerald-600">❋</span> Grow fungus</div>
            <div className="flex items-center gap-1.5"><span className="text-amber-600">♥</span> Nurse larvae</div>
            <div className="flex items-center gap-1.5"><span className="text-blue-600">≈</span> Control climate</div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-black/60 rounded-xl p-4 border border-amber-900/15 mb-8 text-left">
          <p className="text-amber-500 text-xs font-bold mb-2 uppercase tracking-wider">Controls</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-amber-200/35">
            <div><kbd className="px-1 py-0.5 bg-amber-900/20 rounded text-amber-400 text-[10px]">Left Click</kbd> Use tool</div>
            <div><kbd className="px-1 py-0.5 bg-amber-900/20 rounded text-amber-400 text-[10px]">Left Drag</kbd> Paint actions</div>
            <div><kbd className="px-1 py-0.5 bg-amber-900/20 rounded text-amber-400 text-[10px]">Right Drag</kbd> Pan camera</div>
            <div><kbd className="px-1 py-0.5 bg-amber-900/20 rounded text-amber-400 text-[10px]">WASD</kbd> Move camera</div>
            <div><kbd className="px-1 py-0.5 bg-amber-900/20 rounded text-amber-400 text-[10px]">Scroll</kbd> Zoom</div>
            <div><kbd className="px-1 py-0.5 bg-amber-900/20 rounded text-amber-400 text-[10px]">Space</kbd> Pause</div>
            <div><kbd className="px-1 py-0.5 bg-amber-900/20 rounded text-amber-400 text-[10px]">1/2/3</kbd> Speed</div>
            <div><kbd className="px-1 py-0.5 bg-amber-900/20 rounded text-amber-400 text-[10px]">P / M</kbd> Views</div>
          </div>
        </div>

        <button
          onClick={handleStart}
          className="px-10 py-4 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-amber-100 font-bold text-lg rounded-lg transition-all transform hover:scale-105 shadow-lg shadow-amber-900/30"
        >
          Start Colony
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [started, setStarted] = useState(false);
  const queenAlive = useGameStore(s => s.queenAlive);
  const running = useGameStore(s => s.running);
  const init = useGameStore(s => s.init);
  const day = useGameStore(s => s.day);
  const colonyScore = useGameStore(s => s.colonyScore);
  const [showVictory, setShowVictory] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  const handleVictoryContinue = useCallback(() => setShowVictory(false), []);
  const handleNewColony = useCallback(() => { init(); setShowVictory(false); }, [init]);

  // Victory at day 30
  const hasWon = started && running && day >= 30 && queenAlive;
  const showVictoryModal = hasWon && !showVictory;

  if (!started) {
    return <IntroScreen onStart={() => setStarted(true)} />;
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#050505]">
      <GameCanvas />
      <HUD />
      <ToolBar />
      {!queenAlive && running && <GameOverScreen />}
      {showVictoryModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="text-center p-8 rounded-xl border border-amber-500/40 bg-black/90 max-w-md">
            <h2 className="text-4xl font-bold text-amber-400 mb-2">Colony Thrives!</h2>
            <p className="text-amber-200/60 text-sm mb-2">Your colony has survived {day} days!</p>
            <p className="text-amber-300 text-lg font-bold mb-4">Score: {colonyScore}</p>
            <p className="text-amber-200/40 text-xs mb-6">You can continue playing or start a new challenge.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleVictoryContinue}
                className="px-6 py-3 bg-amber-700 hover:bg-amber-600 text-amber-100 font-bold rounded-lg transition-colors"
              >
                Continue
              </button>
              <button
                onClick={handleNewColony}
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold rounded-lg transition-colors"
              >
                New Colony
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
