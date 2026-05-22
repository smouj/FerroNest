// ============================================================
// FerroNest - Game Canvas Component (Professional Edition)
// Enhanced camera: bounds, edge scrolling, follow mode, minimap click
// ============================================================

'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useGameStore } from '@/game/store';
import { renderGame, renderMinimap } from '@/game/renderer';
import { CELL_SIZE, MAP_WIDTH, MAP_HEIGHT, CAMERA_SETTINGS, SURFACE_ROW } from '@/game/constants';
import { GameTool, PheromoneType, AntCaste, AntState } from '@/game/types';
import { initAudio, isAudioInitialized, updateAmbient, playSound } from '@/game/audio';

// Edge scroll config
const EDGE_SCROLL_ZONE = 40; // pixels from edge
const EDGE_SCROLL_SPEED = 6; // pixels per frame

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const stateRef = useRef(useGameStore.getState());
  const isDragging = useRef(false);
  const isPainting = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, camTargetX: 0, camTargetY: 0 });
  const frameCounterRef = useRef(0);

  // Smooth camera panning refs - store desired camera position & zoom
  const cameraTargetRef = useRef({ x: 0, y: 0 });
  const zoomTargetRef = useRef(1);
  const smoothInitialized = useRef(false);

  // Track mouse position for zoom-toward-cursor and edge scrolling
  const mouseScreenRef = useRef({ x: -1, y: -1 });
  // Track which keys are held for continuous smooth panning
  const keysHeld = useRef<Set<string>>(new Set());

  // Follow mode: 'off' | 'queen' | 'selected'
  const followModeRef = useRef<'off' | 'queen' | 'selected'>('off');

  // Minimap click state
  const minimapRectRef = useRef({ x: 0, y: 0, w: 0, h: 0 });

  // Keep stateRef updated
  useEffect(() => {
    const unsub = useGameStore.subscribe((state) => {
      stateRef.current = state;
    });
    return unsub;
  }, []);

  // Clamp camera to map bounds
  const clampCamera = useCallback((camX: number, camY: number, zoom: number, canvasW: number, canvasH: number) => {
    const mapW = MAP_WIDTH * CELL_SIZE;
    const mapH = MAP_HEIGHT * CELL_SIZE;
    const viewW = canvasW / zoom;
    const viewH = canvasH / zoom;

    // Allow some over-scroll but clamp to reasonable bounds
    const minX = -viewW * 0.3;
    const maxX = mapW - viewW * 0.7;
    const minY = -viewH * 0.3;
    const maxY = mapH - viewH * 0.7;

    return {
      x: Math.max(minX, Math.min(maxX, camX)),
      y: Math.max(minY, Math.min(maxY, camY)),
    };
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
        const maxTicks = state.speed * 2;
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

      // Update ambient sounds based on game state
      if (isAudioInitialized()) {
        updateAmbient({
          events: renderState.events,
          cameraY: renderState.cameraY,
          currentTick: renderState.currentTick,
        });
      }

      // Get current canvas dimensions for bounds
      const rect = canvas.getBoundingClientRect();

      // Continuous smooth panning from held keys
      const panSpeed = CAMERA_SETTINGS.panSpeed;
      if (keysHeld.current.has('a') || keysHeld.current.has('ArrowLeft')) {
        cameraTargetRef.current.x -= panSpeed;
        followModeRef.current = 'off';
      }
      if (keysHeld.current.has('d') || keysHeld.current.has('ArrowRight')) {
        cameraTargetRef.current.x += panSpeed;
        followModeRef.current = 'off';
      }
      if (keysHeld.current.has('w') || keysHeld.current.has('ArrowUp')) {
        cameraTargetRef.current.y -= panSpeed;
        followModeRef.current = 'off';
      }
      if (keysHeld.current.has('s') || keysHeld.current.has('ArrowDown')) {
        cameraTargetRef.current.y += panSpeed;
        followModeRef.current = 'off';
      }

      // Edge scrolling - when mouse is near screen edges, auto-scroll
      const mx = mouseScreenRef.current.x;
      const my = mouseScreenRef.current.y;
      if (mx >= 0 && my >= 0 && !isDragging.current) {
        const currentZoom = zoomTargetRef.current;
        if (mx < EDGE_SCROLL_ZONE) {
          cameraTargetRef.current.x -= EDGE_SCROLL_SPEED * (1 - mx / EDGE_SCROLL_ZONE) / currentZoom;
          followModeRef.current = 'off';
        } else if (mx > rect.width - EDGE_SCROLL_ZONE) {
          cameraTargetRef.current.x += EDGE_SCROLL_SPEED * (1 - (rect.width - mx) / EDGE_SCROLL_ZONE) / currentZoom;
          followModeRef.current = 'off';
        }
        if (my < EDGE_SCROLL_ZONE) {
          cameraTargetRef.current.y -= EDGE_SCROLL_SPEED * (1 - my / EDGE_SCROLL_ZONE) / currentZoom;
          followModeRef.current = 'off';
        } else if (my > rect.height - EDGE_SCROLL_ZONE) {
          cameraTargetRef.current.y += EDGE_SCROLL_SPEED * (1 - (rect.height - my) / EDGE_SCROLL_ZONE) / currentZoom;
          followModeRef.current = 'off';
        }
      }

      // Follow mode - track queen or selected ant
      if (followModeRef.current !== 'off') {
        const currentState = stateRef.current;
        let targetAnt = null;

        if (followModeRef.current === 'queen') {
          targetAnt = currentState.ants.find(a => a.caste === AntCaste.Queen && a.state !== AntState.Dead);
        } else if (followModeRef.current === 'selected') {
          if (currentState.selectedAnt) {
            targetAnt = currentState.ants.find(a => a.id === currentState.selectedAnt && a.state !== AntState.Dead);
          }
          if (!targetAnt) {
            // Fall back to queen if selected ant is gone
            targetAnt = currentState.ants.find(a => a.caste === AntCaste.Queen && a.state !== AntState.Dead);
          }
        }

        if (targetAnt) {
          const currentZoom = zoomTargetRef.current;
          cameraTargetRef.current.x = targetAnt.x * CELL_SIZE - rect.width / currentZoom / 2 + CELL_SIZE / 2;
          cameraTargetRef.current.y = targetAnt.y * CELL_SIZE - rect.height / currentZoom / 2 + CELL_SIZE / 2;
        }
      }

      // Clamp camera target to map bounds
      const currentZoom = zoomTargetRef.current;
      const clamped = clampCamera(cameraTargetRef.current.x, cameraTargetRef.current.y, currentZoom, rect.width, rect.height);
      cameraTargetRef.current.x = clamped.x;
      cameraTargetRef.current.y = clamped.y;

      // Smooth camera interpolation - slightly faster for better feel
      const currentState = stateRef.current;
      const smoothFactor = 0.15;  // was 0.12
      const smoothZoomFactor = 0.14; // was 0.1

      const currentCamX = currentState.cameraX;
      const currentCamY = currentState.cameraY;
      const currentZoomState = currentState.zoom;
      const targetX = cameraTargetRef.current.x;
      const targetY = cameraTargetRef.current.y;
      const targetZoom = zoomTargetRef.current;

      const newCamX = currentCamX + (targetX - currentCamX) * smoothFactor;
      const newCamY = currentCamY + (targetY - currentCamY) * smoothFactor;
      const newZoom = currentZoomState + (targetZoom - currentZoomState) * smoothZoomFactor;

      // Only update store if change is significant (avoid unnecessary renders)
      // Throttle camera updates to every 3 frames for performance
      frameCounterRef.current++;
      const camMoved = Math.abs(newCamX - currentCamX) > 0.05 || Math.abs(newCamY - currentCamY) > 0.05;
      const zoomChanged = Math.abs(newZoom - currentZoomState) > 0.001;

      if ((camMoved && frameCounterRef.current % 3 === 0) || zoomChanged) {
        // Write interpolated values directly into stateRef for renderer to read immediately
        // while also updating the store for React subscribers
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

        // Store minimap rect for click handling
        minimapRectRef.current = { x: minimapX, y: minimapY, w: minimapW, h: minimapH };

        renderMinimap(ctx, renderState, minimapX, minimapY, minimapW, minimapH);
      }

      // Follow mode indicator
      if (followModeRef.current !== 'off') {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(rect.width - 80, 8, 72, 16);
        ctx.fillStyle = followModeRef.current === 'queen' ? '#FFD700' : '#4CAF50';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          followModeRef.current === 'queen' ? 'FOLLOW Q' : 'FOLLOW',
          rect.width - 44, 16
        );
      }

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [clampCamera]);

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
        playSound('dig');
        break;
      case GameTool.BuildChamber:
        store.build(gameX, gameY, state.selectedChamberType);
        playSound('build');
        break;
      case GameTool.MarkPheromone:
      case GameTool.Prioritize:
      case GameTool.Evacuate:
      case GameTool.Defend:
        store.markPhero(gameX, gameY, state.selectedPheromoneType);
        playSound('pheromone_mark');
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
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize audio on first user interaction
    if (!isAudioInitialized()) {
      initAudio();
    }

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Check if clicking on minimap
    if (e.button === 0) {
      const mm = minimapRectRef.current;
      const state = stateRef.current;
      if (state.showMinimap && mx >= mm.x && mx <= mm.x + mm.w && my >= mm.y && my <= mm.y + mm.h) {
        // Click on minimap - move camera to that location
        const relX = (mx - mm.x) / mm.w;
        const relY = (my - mm.y) / mm.h;
        const worldX = relX * MAP_WIDTH * CELL_SIZE;
        const worldY = relY * MAP_HEIGHT * CELL_SIZE;
        const zoom = zoomTargetRef.current;
        cameraTargetRef.current.x = worldX - rect.width / zoom / 2;
        cameraTargetRef.current.y = worldY - rect.height / zoom / 2;
        followModeRef.current = 'off';
        return;
      }
    }

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
      followModeRef.current = 'off';
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

  const handleMouseLeave = useCallback(() => {
    isDragging.current = false;
    isPainting.current = false;
    mouseScreenRef.current = { x: -1, y: -1 };
  }, []);

  // Scroll wheel for zoom - zoom toward mouse cursor
  const handleWheel = useCallback((e: React.WheelEvent) => {
    const state = stateRef.current;
    const currentZoom = state.zoom;
    const zoomDelta = e.deltaY > 0 ? -0.08 : 0.08;
    const newZoom = Math.max(CAMERA_SETTINGS.minZoom, Math.min(CAMERA_SETTINGS.maxZoom, currentZoom + zoomDelta));

    if (Math.abs(newZoom - currentZoom) < 0.001) return;

    // Zoom toward mouse cursor position
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
        case 'f':
        case 'F':
          // Toggle follow mode
          if (followModeRef.current === 'off') {
            followModeRef.current = 'queen';
          } else if (followModeRef.current === 'queen') {
            // If there's a selected ant, follow that instead
            if (state.selectedAnt) {
              followModeRef.current = 'selected';
            } else {
              followModeRef.current = 'off';
            }
          } else {
            followModeRef.current = 'off';
          }
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
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
