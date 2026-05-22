// ============================================================
// FerroNest - UI Settings Store (separate from game engine)
// ============================================================

import { create } from 'zustand';

export type Difficulty = 'easy' | 'normal' | 'hard';
export type MinimapPosition = 'bottom-right' | 'top-right';

export interface UISettings {
  // Difficulty (set at game start)
  difficulty: Difficulty;

  // Audio
  masterVolume: number; // 0-100
  sfxVolume: number;    // 0-100
  ambientVolume: number; // 0-100

  // Camera
  cameraSmoothPanning: boolean;
  autoFollowQueen: boolean;

  // Display
  showFpsCounter: boolean;
  minimapPosition: MinimapPosition;

  // Settings panel open state
  settingsOpen: boolean;
}

export interface UIStore extends UISettings {
  setDifficulty: (d: Difficulty) => void;
  setMasterVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  setAmbientVolume: (v: number) => void;
  setCameraSmoothPanning: (v: boolean) => void;
  setAutoFollowQueen: (v: boolean) => void;
  setShowFpsCounter: (v: boolean) => void;
  setMinimapPosition: (p: MinimapPosition) => void;
  setSettingsOpen: (v: boolean) => void;
  toggleSettings: () => void;
}

export const useUIStore = create<UIStore>((set, get) => ({
  difficulty: 'normal',
  masterVolume: 80,
  sfxVolume: 70,
  ambientVolume: 60,
  cameraSmoothPanning: true,
  autoFollowQueen: false,
  showFpsCounter: false,
  minimapPosition: 'bottom-right',
  settingsOpen: false,

  setDifficulty: (d) => set({ difficulty: d }),
  setMasterVolume: (v) => set({ masterVolume: v }),
  setSfxVolume: (v) => set({ sfxVolume: v }),
  setAmbientVolume: (v) => set({ ambientVolume: v }),
  setCameraSmoothPanning: (v) => set({ cameraSmoothPanning: v }),
  setAutoFollowQueen: (v) => set({ autoFollowQueen: v }),
  setShowFpsCounter: (v) => set({ showFpsCounter: v }),
  setMinimapPosition: (p) => set({ minimapPosition: p }),
  setSettingsOpen: (v) => set({ settingsOpen: v }),
  toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),
}));
