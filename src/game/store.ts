// ============================================================
// FerroNest - Zustand Game Store (Professional Edition)
// ============================================================

import { create } from 'zustand';
import { GameState, GameTool, ChamberType, PheromoneType, MindAbilityType } from './types';
import { createInitialState, gameTick, excavateArea, buildChamber, markPheromone, activateMindAbility, setGameSpeed, togglePause } from './engine';

interface GameStore extends GameState {
  init: () => void;
  tick: () => void;
  excavate: (x: number, y: number) => void;
  build: (x: number, y: number, type: ChamberType) => void;
  markPhero: (x: number, y: number, type: PheromoneType) => void;
  activateMind: (ability: MindAbilityType) => void;
  setTool: (tool: GameTool) => void;
  setChamberType: (type: ChamberType) => void;
  setPheromoneType: (type: PheromoneType) => void;
  togglePheromoneView: () => void;
  toggleMinimap: () => void;
  setCamera: (x: number, y: number) => void;
  setZoom: (zoom: number) => void;
  changeSpeed: (speed: number) => void;
  togglePaused: () => void;
  setHoveredCell: (cell: { x: number; y: number } | null) => void;
  setSelectedAnt: (id: string | null) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialState(),

  init: () => {
    set(createInitialState());
  },

  tick: () => {
    const state = get();
    const newState = gameTick(state);
    set(newState);
  },

  excavate: (x: number, y: number) => {
    const state = get();
    const newState = excavateArea(state, x, y);
    set(newState);
  },

  build: (x: number, y: number, type: ChamberType) => {
    const state = get();
    const newState = buildChamber(state, x, y, type);
    set(newState);
  },

  markPhero: (x: number, y: number, type: PheromoneType) => {
    const state = get();
    const newState = markPheromone(state, x, y, type);
    set(newState);
  },

  activateMind: (ability: MindAbilityType) => {
    const state = get();
    const newState = activateMindAbility(state, ability);
    set(newState);
  },

  setTool: (tool: GameTool) => set({ selectedTool: tool }),
  setChamberType: (type: ChamberType) => set({ selectedChamberType: type }),
  setPheromoneType: (type: PheromoneType) => set({ selectedPheromoneType: type }),
  togglePheromoneView: () => set(s => ({ showPheromoneView: !s.showPheromoneView })),
  toggleMinimap: () => set(s => ({ showMinimap: !s.showMinimap })),
  setCamera: (x: number, y: number) => set({ cameraX: x, cameraY: y }),
  setZoom: (zoom: number) => set({ zoom: Math.max(0.4, Math.min(2.5, zoom)) }),
  changeSpeed: (speed: number) => {
    const state = get();
    const newState = setGameSpeed(state, speed);
    set({ speed: newState.speed });
  },
  togglePaused: () => {
    const state = get();
    const newState = togglePause(state);
    set({ paused: newState.paused });
  },
  setHoveredCell: (cell: { x: number; y: number } | null) => set({ hoveredCell: cell }),
  setSelectedAnt: (id: string | null) => set({ selectedAnt: id }),
}));
