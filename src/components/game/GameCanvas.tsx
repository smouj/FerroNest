// ============================================================
// FerroNest - Game Canvas Component (Professional Edition)
// ============================================================

'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useGameStore } from '@/game/store';
import { renderGame, renderMinimap } from '@/game/renderer';
import { CELL_SIZE, MAP_WIDTH, MAP_HEIGHT, CAMERA_SETTINGS } from '@/game/constants';
import { GameTool, TerrainType, PheromoneType } from '@/game/types';

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const stateRef = useRef(useGameStore.getState());
  const isDragging = useRef(false);
  const isPainting = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, camX: 0, camY: 0 });

  // Keep stateRef updated
  useEffect(() => {
    const unsub = useGameStore.subscribe((state) => {
      stateRef.current = state;
    });
    return unsub;
  }, []);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let tickAccumulator = 0;
    const TICK_RATE = 1000 / 30;

    const loop = (timestamp: number) => {
      if (!lastTickRef.current) lastTickRef.current = timestamp;
      const delta = timestamp - lastTickRef.current;
      lastTickRef.current = timestamp;

      const state = stateRef.current;

      if (state.running && !state.paused) {
        tickAccumulator += delta;
        const maxTicks = state.speed * 3;
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

      // Main game render
      renderGame(ctx, currentState, rect.width, rect.height);

      // Minimap
      if (currentState.showMinimap) {
        const minimapW = 160;
        const minimapH = 100;
        const minimapX = rect.width - minimapW - 8;
        const minimapY = rect.height - minimapH - 40;

        renderMinimap(ctx, currentState, minimapX, minimapY, minimapW, minimapH);
      }

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Convert screen coords to game coords
  const screenToGame = useCallback((e: React.MouseEvent | MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const state = stateRef.current;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const gameX = Math.floor((mx / state.zoom + state.cameraX) / CELL_SIZE);
    const gameY = Math.floor((my / state.zoom + state.cameraY) / CELL_SIZE);

    if (gameX < 0 || gameX >= MAP_WIDTH || gameY < 0 || gameY >= MAP_HEIGHT) return null;
    return { x: gameX, y: gameY };
  }, []);

  // Handle mouse actions
  const handleToolAction = useCallback((gameX: number, gameY: number) => {
    const state = stateRef.current;
    const store = useGameStore.getState();

    switch (state.selectedTool) {
      case GameTool.Excavate:
      case GameTool.Expand:
        store.excavate(gameX, gameY);
        break;
      case GameTool.BuildChamber:
        store.build(gameX, gameY, state.selectedChamberType);
        break;
      case GameTool.MarkPheromone:
      case GameTool.Prioritize:
      case GameTool.Evacuate:
      case GameTool.Defend:
        store.markPhero(gameX, gameY, state.selectedPheromoneType);
        break;
      case GameTool.Select:
        // Find ant at position
        const ant = state.ants.find(a => {
          if (a.state === 'dead') return false;
          const dist = Math.sqrt((a.x - gameX) ** 2 + (a.y - gameY) ** 2);
          return dist < 2;
        });
        store.setSelectedAnt(ant?.id || null);
        break;
    }
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 2 || e.button === 1) {
      // Right/middle click: pan camera
      isDragging.current = true;
      const state = stateRef.current;
      dragStart.current = { x: e.clientX, y: e.clientY, camX: state.cameraX, camY: state.cameraY };
      e.preventDefault();
    } else if (e.button === 0) {
      // Left click: tool action
      const coords = screenToGame(e);
      if (coords) {
        handleToolAction(coords.x, coords.y);
        isPainting.current = true;
      }
    }
  }, [screenToGame, handleToolAction]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging.current) {
      const state = stateRef.current;
      const zoom = state.zoom;
      const dx = (e.clientX - dragStart.current.x) / zoom;
      const dy = (e.clientY - dragStart.current.y) / zoom;
      useGameStore.getState().setCamera(dragStart.current.camX - dx, dragStart.current.camY - dy);
    } else if (isPainting.current) {
      // Drag-painting for pheromones and excavation
      const coords = screenToGame(e);
      if (coords) {
        const state = stateRef.current;
        if (state.selectedTool === GameTool.MarkPheromone ||
          state.selectedTool === GameTool.Excavate ||
          state.selectedTool === GameTool.Expand ||
          state.selectedTool === GameTool.Prioritize ||
          state.selectedTool === GameTool.Evacuate ||
          state.selectedTool === GameTool.Defend) {
          handleToolAction(coords.x, coords.y);
        }
      }
    }

    // Update hovered cell
    const coords = screenToGame(e);
    useGameStore.getState().setHoveredCell(coords);
  }, [screenToGame, handleToolAction]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    isPainting.current = false;
  }, []);

  // Scroll wheel for zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    const state = stateRef.current;
    const newZoom = state.zoom + (e.deltaY > 0 ? -0.08 : 0.08);
    useGameStore.getState().setZoom(newZoom);
    e.preventDefault();
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = stateRef.current;
      const store = useGameStore.getState();
      const panSpeed = CAMERA_SETTINGS.panSpeed;

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
          store.setCamera(state.cameraX - panSpeed, state.cameraY);
          break;
        case 'ArrowRight':
        case 'd':
          store.setCamera(state.cameraX + panSpeed, state.cameraY);
          break;
        case 'ArrowUp':
        case 'w':
          store.setCamera(state.cameraX, state.cameraY - panSpeed);
          break;
        case 'ArrowDown':
        case 's':
          store.setCamera(state.cameraX, state.cameraY + panSpeed);
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
        case 'p':
          store.togglePheromoneView();
          break;
        case 'm':
          store.toggleMinimap();
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
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
