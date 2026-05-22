// ============================================================
// FerroNest - Game Canvas Component (Professional Edition)
// ============================================================

'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useGameStore } from '@/game/store';
import { renderGame, renderMinimap } from '@/game/renderer';
import { CELL_SIZE, MAP_WIDTH, MAP_HEIGHT, CAMERA_SETTINGS } from '@/game/constants';
import { GameTool, PheromoneType } from '@/game/types';

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const stateRef = useRef(useGameStore.getState());
  const isDragging = useRef(false);
  const isPainting = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, camTargetX: 0, camTargetY: 0 });

  // Smooth camera panning refs - store desired camera position & zoom
  const cameraTargetRef = useRef({ x: 0, y: 0 });
  const zoomTargetRef = useRef(1);
  const smoothInitialized = useRef(false);

  // Track mouse position for zoom-toward-cursor
  const mouseScreenRef = useRef({ x: 0, y: 0 });
  // Track which keys are held for continuous smooth panning
  const keysHeld = useRef<Set<string>>(new Set());

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

      // Initialize smooth camera target from current state on first frame
      if (!smoothInitialized.current) {
        cameraTargetRef.current = { x: state.cameraX, y: state.cameraY };
        zoomTargetRef.current = state.zoom;
        smoothInitialized.current = true;
      }

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

      // Continuous smooth panning from held keys
      const panSpeed = CAMERA_SETTINGS.panSpeed;
      if (keysHeld.current.has('a') || keysHeld.current.has('ArrowLeft')) {
        cameraTargetRef.current.x -= panSpeed;
      }
      if (keysHeld.current.has('d') || keysHeld.current.has('ArrowRight')) {
        cameraTargetRef.current.x += panSpeed;
      }
      if (keysHeld.current.has('w') || keysHeld.current.has('ArrowUp')) {
        cameraTargetRef.current.y -= panSpeed;
      }
      if (keysHeld.current.has('s') || keysHeld.current.has('ArrowDown')) {
        cameraTargetRef.current.y += panSpeed;
      }

      // Smooth camera interpolation
      const currentState = stateRef.current;
      const smoothFactor = 0.12;
      const smoothZoomFactor = 0.1;

      const currentCamX = currentState.cameraX;
      const currentCamY = currentState.cameraY;
      const currentZoom = currentState.zoom;
      const targetX = cameraTargetRef.current.x;
      const targetY = cameraTargetRef.current.y;
      const targetZoom = zoomTargetRef.current;

      const newCamX = currentCamX + (targetX - currentCamX) * smoothFactor;
      const newCamY = currentCamY + (targetY - currentCamY) * smoothFactor;
      const newZoom = currentZoom + (targetZoom - currentZoom) * smoothZoomFactor;

      // Only update store if change is significant (avoid unnecessary renders)
      const camMoved = Math.abs(newCamX - currentCamX) > 0.05 || Math.abs(newCamY - currentCamY) > 0.05;
      const zoomChanged = Math.abs(newZoom - currentZoom) > 0.001;

      if (camMoved || zoomChanged) {
        const store = useGameStore.getState();
        if (camMoved) {
          store.setCamera(newCamX, newCamY);
        }
        if (zoomChanged) {
          // Use direct set to avoid clamping in setZoom interfering with smooth interpolation
          useGameStore.setState({ zoom: Math.max(CAMERA_SETTINGS.minZoom, Math.min(CAMERA_SETTINGS.maxZoom, newZoom)) });
        }
      }

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
      const renderState = stateRef.current;
      renderGame(ctx, renderState, rect.width, rect.height);

      // Minimap
      if (renderState.showMinimap) {
        const minimapW = 160;
        const minimapH = 100;
        const minimapX = rect.width - minimapW - 8;
        const minimapY = rect.height - minimapH - 40;

        renderMinimap(ctx, renderState, minimapX, minimapY, minimapW, minimapH);
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
      // Right/middle click: pan camera - store camera TARGET for smooth drag
      isDragging.current = true;
      const target = cameraTargetRef.current;
      dragStart.current = { x: e.clientX, y: e.clientY, camTargetX: target.x, camTargetY: target.y };
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
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      mouseScreenRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    if (isDragging.current) {
      const zoom = stateRef.current.zoom;
      const dx = (e.clientX - dragStart.current.x) / zoom;
      const dy = (e.clientY - dragStart.current.y) / zoom;
      // Update the camera TARGET for smooth panning
      cameraTargetRef.current.x = dragStart.current.camTargetX - dx;
      cameraTargetRef.current.y = dragStart.current.camTargetY - dy;
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

  // Scroll wheel for zoom - zoom toward mouse cursor
  const handleWheel = useCallback((e: React.WheelEvent) => {
    const state = stateRef.current;
    const currentZoom = state.zoom;
    const zoomDelta = e.deltaY > 0 ? -0.08 : 0.08;
    const newZoom = Math.max(CAMERA_SETTINGS.minZoom, Math.min(CAMERA_SETTINGS.maxZoom, currentZoom + zoomDelta));

    if (Math.abs(newZoom - currentZoom) < 0.001) return;

    // Zoom toward mouse cursor position
    // World position under the mouse: worldX = cameraX + mouseX / currentZoom
    // After zoom, we want the same world point under the mouse: worldX = newCamX + mouseX / newZoom
    // So: newCamX = worldX - mouseX / newZoom = cameraX + mouseX / currentZoom - mouseX / newZoom
    const mx = mouseScreenRef.current.x;
    const my = mouseScreenRef.current.y;

    const worldX = cameraTargetRef.current.x + mx / currentZoom;
    const worldY = cameraTargetRef.current.y + my / currentZoom;

    cameraTargetRef.current.x = worldX - mx / newZoom;
    cameraTargetRef.current.y = worldY - my / newZoom;
    zoomTargetRef.current = newZoom;

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
          // Update camera target for smooth panning
          cameraTargetRef.current.x -= panSpeed;
          keysHeld.current.add(e.key);
          break;
        case 'ArrowRight':
        case 'd':
          cameraTargetRef.current.x += panSpeed;
          keysHeld.current.add(e.key);
          break;
        case 'ArrowUp':
        case 'w':
          cameraTargetRef.current.y -= panSpeed;
          keysHeld.current.add(e.key);
          break;
        case 'ArrowDown':
        case 's':
          cameraTargetRef.current.y += panSpeed;
          keysHeld.current.add(e.key);
          break;
        case '+':
        case '=':
          zoomTargetRef.current = Math.min(CAMERA_SETTINGS.maxZoom, zoomTargetRef.current + 0.1);
          break;
        case '-':
          zoomTargetRef.current = Math.max(CAMERA_SETTINGS.minZoom, zoomTargetRef.current - 0.1);
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

    const handleKeyUp = (e: KeyboardEvent) => {
      keysHeld.current.delete(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
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
