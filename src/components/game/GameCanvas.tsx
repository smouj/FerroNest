// ============================================================
// FerroNest - Game Canvas Component
// ============================================================

'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useGameStore } from '@/game/store';
import { renderGame } from '@/game/renderer';
import { CELL_SIZE, MAP_WIDTH, MAP_HEIGHT } from '@/game/constants';
import { GameTool } from '@/game/types';

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const stateRef = useRef(useGameStore.getState());

  // Keep stateRef updated
  useEffect(() => {
    const unsub = useGameStore.subscribe((state) => {
      stateRef.current = state;
    });
    return unsub;
  }, []);

  const doTick = useGameStore(s => s.tick);

  // Game loop - separate from React renders
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let tickAccumulator = 0;
    const TICK_RATE = 1000 / 30; // 30 ticks per second

    const loop = (timestamp: number) => {
      if (!lastTickRef.current) lastTickRef.current = timestamp;
      const delta = timestamp - lastTickRef.current;
      lastTickRef.current = timestamp;

      const state = stateRef.current;

      // Update game state
      if (state.running && !state.paused) {
        tickAccumulator += delta;
        const maxTicks = state.speed * 3; // Prevent spiral of death
        let ticks = 0;
        while (tickAccumulator >= TICK_RATE && ticks < maxTicks) {
          useGameStore.getState().tick();
          tickAccumulator -= TICK_RATE;
          ticks++;
        }
        if (tickAccumulator > TICK_RATE * maxTicks) {
          tickAccumulator = 0;
        }
      }

      // Render using current state
      const currentState = stateRef.current;

      // Resize canvas
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const targetWidth = Math.floor(rect.width * dpr);
      const targetHeight = Math.floor(rect.height * dpr);

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      renderGame(ctx, currentState, rect.width, rect.height);

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []); // Empty deps - loop runs independently

  // Handle mouse click
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const state = stateRef.current;
    const { cameraX, cameraY, zoom, selectedTool, selectedChamberType, selectedPheromoneType } = state;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Convert to game coordinates
    const gameX = Math.floor((mx / zoom + cameraX) / CELL_SIZE);
    const gameY = Math.floor((my / zoom + cameraY) / CELL_SIZE);

    if (gameX < 0 || gameX >= MAP_WIDTH || gameY < 0 || gameY >= MAP_HEIGHT) return;

    const store = useGameStore.getState();

    switch (selectedTool) {
      case GameTool.Excavate:
        store.excavate(gameX, gameY);
        break;
      case GameTool.BuildChamber:
        store.build(gameX, gameY, selectedChamberType);
        break;
      case GameTool.MarkPheromone:
        store.markPhero(gameX, gameY, selectedPheromoneType);
        break;
      case GameTool.Prioritize:
        store.markPhero(gameX, gameY, selectedPheromoneType);
        break;
      case GameTool.Evacuate:
        store.markPhero(gameX, gameY, selectedPheromoneType);
        break;
      case GameTool.Defend:
        store.markPhero(gameX, gameY, selectedPheromoneType);
        break;
      case GameTool.Expand:
        store.excavate(gameX, gameY);
        break;
    }
  }, []);

  // Handle drag for camera pan
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, camX: 0, camY: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 2 || e.button === 1) { // Right or middle click
      isDragging.current = true;
      const state = stateRef.current;
      dragStart.current = { x: e.clientX, y: e.clientY, camX: state.cameraX, camY: state.cameraY };
      e.preventDefault();
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging.current) {
      const state = stateRef.current;
      const zoom = state.zoom;
      const dx = (e.clientX - dragStart.current.x) / zoom;
      const dy = (e.clientY - dragStart.current.y) / zoom;
      useGameStore.getState().setCamera(dragStart.current.camX - dx, dragStart.current.camY - dy);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Handle scroll wheel for zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    const state = stateRef.current;
    const newZoom = state.zoom + (e.deltaY > 0 ? -0.1 : 0.1);
    useGameStore.getState().setZoom(newZoom);
  }, []);

  // Handle keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = stateRef.current;
      const store = useGameStore.getState();

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
          store.setCamera(state.cameraX - 20, state.cameraY);
          break;
        case 'ArrowRight':
        case 'd':
          store.setCamera(state.cameraX + 20, state.cameraY);
          break;
        case 'ArrowUp':
        case 'w':
          store.setCamera(state.cameraX, state.cameraY - 20);
          break;
        case 'ArrowDown':
        case 's':
          store.setCamera(state.cameraX, state.cameraY + 20);
          break;
        case '+':
        case '=':
          store.setZoom(state.zoom + 0.1);
          break;
        case '-':
          store.setZoom(state.zoom - 0.1);
          break;
        case ' ':
          e.preventDefault();
          store.togglePaused();
          break;
        case '1':
          store.changeSpeed(1);
          break;
        case '2':
          store.changeSpeed(2);
          break;
        case '3':
          store.changeSpeed(3);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-crosshair"
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
