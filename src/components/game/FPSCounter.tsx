// ============================================================
// FerroNest - FPS Counter (toggleable)
// ============================================================

'use client';

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/game/store';
import { useUIStore } from '@/game/ui-store';

export function FPSCounter() {
  const showFpsCounter = useUIStore(s => s.showFpsCounter);
  const currentTick = useGameStore(s => s.currentTick);
  const ants = useGameStore(s => s.ants);

  const [fps, setFps] = useState(0);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  useEffect(() => {
    if (!showFpsCounter) return;

    let animId: number;
    const measure = () => {
      frameCountRef.current++;
      const now = performance.now();
      const elapsed = now - lastTimeRef.current;
      if (elapsed >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / elapsed));
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
      animId = requestAnimationFrame(measure);
    };
    animId = requestAnimationFrame(measure);

    return () => cancelAnimationFrame(animId);
  }, [showFpsCounter]);

  if (!showFpsCounter) return null;

  const livingAnts = ants.filter(a => a.state !== 'dead').length;

  return (
    <div className="absolute top-12 left-2 z-20 pointer-events-none">
      <div className="bg-black/70 backdrop-blur-sm rounded px-2 py-1 border border-amber-900/20 font-mono text-[10px] text-amber-200/50 space-y-0.5">
        <div>FPS: <span className={fps < 20 ? 'text-red-400' : fps < 40 ? 'text-amber-400' : 'text-emerald-400'}>{fps}</span></div>
        <div>Ants: {livingAnts}</div>
        <div>Tick: {currentTick}</div>
      </div>
    </div>
  );
}
