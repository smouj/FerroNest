// ============================================================
// FerroNest - Main Page (Professional Edition v2)
// ============================================================

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { GameCanvas } from '@/components/game/GameCanvas';
import { HUD } from '@/components/game/HUD';
import { ToolBar } from '@/components/game/ToolBar';
import { SettingsPanel } from '@/components/game/SettingsPanel';
import { FPSCounter } from '@/components/game/FPSCounter';
import { useGameStore } from '@/game/store';
import { useUIStore, type Difficulty } from '@/game/ui-store';
import {
  Hammer,
  Building2,
  Pen,
  Shield,
  Egg,
  Sword,
  Sprout,
  Heart,
  Droplets,
} from 'lucide-react';

// --- Animated Ant SVG Component ---
function AnimatedAnt() {
  return (
    <div className="relative w-full h-12 mb-6 overflow-hidden">
      <svg
        className="absolute ant-walk"
        width="48"
        height="24"
        viewBox="0 0 48 24"
        fill="none"
        style={{ top: 8 }}
      >
        {/* Ant body */}
        <ellipse cx="24" cy="12" rx="5" ry="4" fill="#8B6914" />
        {/* Thorax */}
        <ellipse cx="18" cy="12" rx="3.5" ry="3" fill="#A07818" />
        {/* Head */}
        <circle cx="12" cy="12" r="3.5" fill="#8B6914" />
        {/* Abdomen */}
        <ellipse cx="31" cy="12" rx="6" ry="4.5" fill="#7A5B10" />
        {/* Antennae */}
        <path d="M9 10 Q6 6 3 4" stroke="#A07818" strokeWidth="0.8" fill="none" strokeLinecap="round" />
        <path d="M9 14 Q6 18 3 20" stroke="#A07818" strokeWidth="0.8" fill="none" strokeLinecap="round" />
        {/* Eyes */}
        <circle cx="10.5" cy="11" r="0.8" fill="#D4A017" />
        <circle cx="10.5" cy="13" r="0.8" fill="#D4A017" />
        {/* Legs - animated */}
        <g className="ant-legs1">
          <line x1="18" y1="14.5" x2="16" y2="20" stroke="#8B6914" strokeWidth="0.7" />
          <line x1="18" y1="9.5" x2="16" y2="4" stroke="#8B6914" strokeWidth="0.7" />
        </g>
        <g className="ant-legs2">
          <line x1="22" y1="15.5" x2="22" y2="21" stroke="#8B6914" strokeWidth="0.7" />
          <line x1="22" y1="8.5" x2="22" y2="3" stroke="#8B6914" strokeWidth="0.7" />
        </g>
        <g className="ant-legs1 ant-legs-offset">
          <line x1="26" y1="15.5" x2="28" y2="21" stroke="#8B6914" strokeWidth="0.7" />
          <line x1="26" y1="8.5" x2="28" y2="3" stroke="#8B6914" strokeWidth="0.7" />
        </g>
        {/* Mandibles */}
        <path d="M8.5 11 L6 10" stroke="#A07818" strokeWidth="0.6" strokeLinecap="round" />
        <path d="M8.5 13 L6 14" stroke="#A07818" strokeWidth="0.6" strokeLinecap="round" />
      </svg>
      {/* Trail dots behind the ant */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-amber-900/0 via-amber-900/20 to-amber-900/0" />
    </div>
  );
}

// --- Background Particles ---
function BackgroundParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number; hue: number }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Create particles
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -Math.random() * 0.4 - 0.1,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.3 + 0.05,
        hue: Math.random() > 0.5 ? 38 : 120, // amber or green (spores)
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10) { p.y = canvas.height + 10; p.x = Math.random() * canvas.width; }
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 60%, 50%, ${p.opacity})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />;
}

// --- Difficulty Selector ---
function DifficultySelector({ value, onChange }: { value: Difficulty; onChange: (d: Difficulty) => void }) {
  const options: { key: Difficulty; label: string; desc: string; color: string }[] = [
    { key: 'easy', label: 'Easy', desc: 'Abundant resources, fewer threats', color: 'from-emerald-800 to-emerald-700 border-emerald-600' },
    { key: 'normal', label: 'Normal', desc: 'Balanced challenge', color: 'from-amber-800 to-amber-700 border-amber-600' },
    { key: 'hard', label: 'Hard', desc: 'Scarce resources, frequent danger', color: 'from-red-800 to-red-700 border-red-600' },
  ];

  return (
    <div className="flex gap-2 justify-center">
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-all ${
            value === opt.key
              ? `bg-gradient-to-b ${opt.color} text-white shadow-lg scale-105`
              : 'bg-black/40 border-amber-900/20 text-amber-200/40 hover:text-amber-200/60 hover:border-amber-900/40'
          }`}
        >
          <div>{opt.label}</div>
          <div className="text-[9px] font-normal opacity-70 mt-0.5">{opt.desc}</div>
        </button>
      ))}
    </div>
  );
}

// --- Game Over Screen ---
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

// --- Improved Intro Screen ---
function IntroScreen({ onStart }: { onStart: () => void }) {
  const [fadeState, setFadeState] = useState<'in' | 'visible' | 'out'>('in');
  const [sectionIndex, setSectionIndex] = useState(0);
  const difficulty = useUIStore(s => s.difficulty);
  const setDifficulty = useUIStore(s => s.setDifficulty);

  useEffect(() => {
    const timer = setTimeout(() => setFadeState('visible'), 100);
    return () => clearTimeout(timer);
  }, []);

  // Sequential fade-in of sections
  useEffect(() => {
    if (fadeState !== 'visible') return;
    const interval = setInterval(() => {
      setSectionIndex(prev => {
        if (prev >= 5) { clearInterval(interval); return prev; }
        return prev + 1;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [fadeState]);

  const handleStart = () => {
    setFadeState('out');
    setTimeout(onStart, 500);
  };

  const sectionFade = (idx: number) =>
    sectionIndex >= idx ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4';

  return (
    <div className={`absolute inset-0 z-50 flex items-center justify-center bg-[#050505] overflow-auto transition-opacity duration-500 ${
      fadeState === 'in' ? 'opacity-0' : fadeState === 'out' ? 'opacity-0' : 'opacity-100'
    }`}>
      <BackgroundParticles />

      <div className="text-center max-w-lg px-6 py-8 relative z-10">
        {/* Version */}
        <div className={`text-amber-200/20 text-[10px] font-mono tracking-widest mb-4 transition-all duration-500 ${sectionFade(0)}`}>
          v1.0.0
        </div>

        {/* Title */}
        <div className={`mb-1 relative transition-all duration-700 ${sectionFade(1)}`}>
          <div className="absolute inset-0 bg-amber-500/5 blur-3xl rounded-full" />
          <span className="text-8xl font-bold tracking-tight bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 bg-clip-text text-transparent relative block leading-tight">
            FerroNest
          </span>
        </div>
        <p className={`text-amber-200/25 text-xs mb-2 tracking-[0.4em] uppercase font-light transition-all duration-700 ${sectionFade(1)}`}>
          Build the colony &middot; Mark the trails &middot; Protect the queen
        </p>

        {/* Animated Ant */}
        <div className={`transition-all duration-500 ${sectionFade(2)}`}>
          <AnimatedAnt />
        </div>

        {/* Description */}
        <div className={`bg-black/60 rounded-xl p-6 border border-amber-900/15 mb-4 text-left transition-all duration-700 ${sectionFade(2)}`}>
          <p className="text-amber-200/60 text-sm leading-relaxed mb-3">
            You don&apos;t control ants. You control a <span className="text-amber-400 font-semibold">collective mind</span>.
          </p>
          <p className="text-amber-200/40 text-sm leading-relaxed mb-4">
            Dig tunnels, organize routes through <span className="text-purple-400 font-semibold">pheromones</span>, raise new castes,
            cultivate fungus gardens, and defend your queen against rain, predators, and rival colonies.
          </p>
          <div className="grid grid-cols-3 gap-2 text-xs text-amber-200/35 mt-4">
            <div className="flex items-center gap-1.5"><Hammer className="w-3.5 h-3.5 text-amber-600 shrink-0" /> Excavate tunnels</div>
            <div className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" /> Build chambers</div>
            <div className="flex items-center gap-1.5"><Pen className="w-3.5 h-3.5 text-purple-600 shrink-0" /> Mark pheromones</div>
            <div className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-red-600 shrink-0" /> Defend the queen</div>
            <div className="flex items-center gap-1.5"><Egg className="w-3.5 h-3.5 text-pink-600 shrink-0" /> Raise brood</div>
            <div className="flex items-center gap-1.5"><Sword className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Fight enemies</div>
            <div className="flex items-center gap-1.5"><Sprout className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Grow fungus</div>
            <div className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-amber-600 shrink-0" /> Nurse larvae</div>
            <div className="flex items-center gap-1.5"><Droplets className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Control climate</div>
          </div>
        </div>

        {/* Controls */}
        <div className={`bg-black/60 rounded-xl p-4 border border-amber-900/15 mb-4 text-left transition-all duration-700 ${sectionFade(3)}`}>
          <p className="text-amber-500 text-xs font-bold mb-2 uppercase tracking-wider">Controls</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-amber-200/35">
            <div><kbd className="px-1 py-0.5 bg-amber-900/20 rounded text-amber-400 text-[10px]">Left Click</kbd> Use tool</div>
            <div><kbd className="px-1 py-0.5 bg-amber-900/20 rounded text-amber-400 text-[10px]">Left Drag</kbd> Paint actions</div>
            <div><kbd className="px-1 py-0.5 bg-amber-900/20 rounded text-amber-400 text-[10px]">Right Drag</kbd> Pan camera</div>
            <div><kbd className="px-1 py-0.5 bg-amber-900/20 rounded text-amber-400 text-[10px]">WASD</kbd> Move camera</div>
            <div><kbd className="px-1 py-0.5 bg-amber-900/20 rounded text-amber-400 text-[10px]">Scroll</kbd> Zoom</div>
            <div><kbd className="px-1 py-0.5 bg-amber-900/20 rounded text-amber-400 text-[10px]">Space</kbd> Pause</div>
            <div><kbd className="px-1 py-0.5 bg-amber-900/20 rounded text-amber-400 text-[10px]">1/2/3</kbd> Speed</div>
            <div><kbd className="px-1 py-0.5 bg-amber-900/20 rounded text-amber-400 text-[10px]">Esc</kbd> Settings</div>
          </div>
        </div>

        {/* Difficulty Selector */}
        <div className={`mb-6 transition-all duration-700 ${sectionFade(4)}`}>
          <p className="text-amber-500 text-xs font-bold mb-2 uppercase tracking-wider">Difficulty</p>
          <DifficultySelector value={difficulty} onChange={setDifficulty} />
        </div>

        {/* Start Button */}
        <div className={`transition-all duration-700 ${sectionFade(5)}`}>
          <button
            onClick={handleStart}
            className="px-12 py-4 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-amber-100 font-bold text-lg rounded-lg transition-all transform hover:scale-105 shadow-lg shadow-amber-900/30"
          >
            Start Colony
          </button>
        </div>

        {/* Credits */}
        <p className="text-amber-200/15 text-[10px] mt-6 tracking-wider">
          A colony simulation by FerroNest
        </p>
      </div>

      {/* CSS Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes antWalk {
          0% { left: -60px; }
          100% { left: calc(100% + 60px); }
        }
        @keyframes antLegs1 {
          0%, 100% { transform: rotate(-10deg); }
          50% { transform: rotate(10deg); }
        }
        @keyframes antLegs2 {
          0%, 100% { transform: rotate(10deg); }
          50% { transform: rotate(-10deg); }
        }
        .ant-walk {
          animation: antWalk 8s linear infinite;
        }
        .ant-legs1 {
          animation: antLegs1 0.3s ease-in-out infinite;
        }
        .ant-legs2 {
          animation: antLegs2 0.3s ease-in-out infinite;
        }
        .ant-legs-offset {
          animation-delay: 0.1s;
        }
      `}} />
    </div>
  );
}

// --- Main Page ---
export default function Home() {
  const [started, setStarted] = useState(false);
  const queenAlive = useGameStore(s => s.queenAlive);
  const running = useGameStore(s => s.running);
  const init = useGameStore(s => s.init);
  const day = useGameStore(s => s.day);
  const colonyScore = useGameStore(s => s.colonyScore);
  const [showVictory, setShowVictory] = useState(false);
  const setSettingsOpen = useUIStore(s => s.setSettingsOpen);

  useEffect(() => {
    init();
  }, [init]);

  // Esc key to toggle settings
  useEffect(() => {
    if (!started) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSettingsOpen(!useUIStore.getState().settingsOpen);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [started, setSettingsOpen]);

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
      <FPSCounter />
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
      <SettingsPanel />
    </div>
  );
}
