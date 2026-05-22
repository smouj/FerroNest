# FerroNest

**You don't give orders. You design signals.**

A strategic ant colony management game where you control a collective mind through pheromone signals. Build tunnels, manage castes, defend against predators, and evolve your colony — all through emergent AI driven by chemical communication.

[![Play Now](https://img.shields.io/badge/Play%20Now-GitHub%20Pages-2ea44f?style=for-the-badge&logo=github)](https://smouj.github.io/FerroNest)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](./LICENSE)

---

## Features

- **Pheromone Signal System** — Paint chemical trails to guide your colony. No direct orders — design the signals, and the ants respond.
- **7 Ant Castes** — Queen, Worker, Scout, Soldier, Nurse, Builder, and Cultivator — each with unique AI, stats, and behaviors.
- **Colony Mind Abilities** — Charge consciousness and unleash powerful abilities like Work Surge, Total Alarm, and Chemical Fury.
- **10 Chamber Types** — Build Queen Chambers, Barracks, Fungus Gardens, Pheromone Labs, and more, each with unique effects.
- **8 Enemy Types** — Defend against Spiders, Wasps, Centipedes, Antlions, Rival Ants, and more with distinct AI behaviors.
- **Dynamic Events** — Rain, droughts, earthquakes, pesticide sprays, and flash floods challenge your colony.
- **Day/Night Cycle & Fog of War** — Stars, moon, sun, and dynamic lighting affect surface visibility and ant behavior.
- **Evolution System** — Choose from 5 branches: Military, Agricultural, Explorer, Subterranean, and Chemical.
- **Procedural Maps** — Every game generates a unique underground world with clay, sand, stone veins, roots, and water.
- **Sound Effects** — Web Audio API synthesized sounds for digging, combat, hatching, events, and ambient atmosphere.
- **Performance Optimized** — Mutation-based simulation, viewport culling, noise caching, and throttled updates.
- **A\* Pathfinding** — Intelligent pathfinding with tunnel quality modifiers and 8-directional movement.

---

## How to Play

### Controls

| Input | Action |
|-------|--------|
| **Left Click / Drag** | Use selected tool (excavate, build, mark pheromone) |
| **Right Click / Drag** | Pan camera |
| **Scroll Wheel** | Zoom in/out (toward cursor) |
| **WASD / Arrow Keys** | Pan camera smoothly |
| **Space** | Pause / Resume |
| **1 / 2 / 3** | Set game speed |
| **P** | Toggle pheromone overlay |
| **M** | Toggle minimap |
| **F** | Toggle follow mode (queen / selected ant) |
| **Esc** | Open settings panel |

### Game Flow

1. **Start** with a Queen, 6 Workers, and 1 Scout in an underground chamber
2. **Excavate** tunnels to expand your nest and reach the surface
3. **Mark pheromones** to direct ants toward food, excavation, or defense
4. **Build chambers** for specialized functions (brood, storage, barracks, etc.)
5. **Defend** against predators and survive environmental events
6. **Evolve** through 4 game phases: Survival > Expansion > Dominance > Empire

---

## Game Mechanics

### Pheromone System

Pheromones are the core mechanic. Instead of selecting and commanding individual ants, you paint pheromone signals on the map. Ants detect and follow these signals based on their caste AI:

| Pheromone | Color | Effect |
|-----------|-------|--------|
| Collect | Green | Workers gather nearby resources |
| Excavate | Orange | Workers dig in marked area |
| Defend | Red | Soldiers rush to position |
| Evacuate | Yellow | All ants flee from area |
| Explore | Blue | Scouts investigate area |
| Attack | Purple | Soldiers go on offensive |
| Priority | Red-Orange | Marks high-priority zone |
| Home | Brown | Points toward queen chamber |
| Food | Gold | Marks food trail |
| Danger | Bright Red | Signals danger area |

Pheromones decay over time, diffuse to adjacent cells, and consume pheromone resources. **Pheromone Labs** boost signal strength by 30%.

### Ant Castes

| Caste | HP | Speed | Attack | Role |
|-------|----|-------|--------|------|
| Queen | 250 | 0.25 | 8 | Lays eggs, emits home pheromone |
| Worker | 35 | 0.70 | 3 | Gathers, excavates, delivers resources |
| Scout | 22 | 1.40 | 2 | Explores, finds food, fast movement |
| Soldier | 100 | 0.45 | 18 | Fights enemies, patrols |
| Nurse | 28 | 0.55 | 1 | Cares for brood, feeds larvae |
| Builder | 45 | 0.55 | 5 | Builds chambers, carries heavy loads |
| Cultivator | 28 | 0.45 | 2 | Tends fungus gardens |

Each ant has a **personality** (Diligent, Brave, Curious, Cautious, Aggressive, Social) that modifies their behavior, and individual **memory** tracking food sources, danger locations, and visited chambers.

### Colony Mind

The Colony Mind charges over time based on ant loyalty. Spend consciousness to activate powerful abilities:

| Ability | Cost | Effect |
|---------|------|--------|
| **Work Surge** | 20 | Workers move 50% faster |
| **Total Alarm** | 30 | All soldiers rush to defend |
| **Perfect Route** | 25 | Optimal pathfinding for all ants |
| **Last Stand** | 40 | Workers block tunnels to protect queen |
| **Evacuation** | 50 | Emergency migration of queen and eggs |
| **Chemical Fury** | 60 | All ants attack with doubled ferocity |

Passive bonuses at consciousness thresholds:
- 25%: +5% work speed
- 50%: +10% work speed, better pathfinding
- 75%: +15% work speed, +10% soldier attack
- 100%: All bonuses + 20% egg laying rate

### Chambers

| Chamber | Cost | Effect |
|---------|------|--------|
| Queen Chamber | 5 Earth | Queen lays eggs here |
| Brood Chamber | 3 Earth, 1 Biomass | Eggs develop 20% faster |
| Food Storage | 2 Earth | Food spoilage -50% |
| Fungus Garden | 3 Earth, 3 Biomass | Produces fungus over time |
| Barracks | 4 Earth, 2 Biomass | Soldiers +20% attack nearby |
| Pheromone Lab | 3 Earth, 3 Biomass | Pheromone strength +30% |
| Waste Chamber | 2 Earth | Contamination -60% nearby |
| Humidity Chamber | 3 Earth, 1 Biomass | Stabilizes humidity +40% |
| Nursery | 2 Earth, 2 Biomass | Brood survival +25% |
| Granary | 2 Earth, 1 Biomass | Sugar/nectar storage +50% |

### Environmental Systems

- **Day/Night Cycle** — 8-phase sky transitions (dawn, noon, dusk, night) with underground light seepage and dawn fog
- **Fog of War** — Only areas near ants are visible; unexplored regions are hidden
- **Temperature** — Varies by depth; extreme temps damage brood
- **Humidity** — Affects fungus growth and chamber conditions
- **Contamination** — Builds up without waste chambers; damages brood
- **Water Levels** — Rain and floods can flood tunnels; animated water with reflections
- **Tunnel Quality** — Affects ant movement speed and fatigue

### Enemies

| Enemy | HP | Attack | Behavior |
|-------|----|--------|----------|
| Wolf Spider | 70 | 14 | Hunts ants, creates web zones |
| Ground Beetle | 120 | 8 | Territorial, patrols set routes |
| Centipede | 90 | 12 | Hunts in tunnels |
| Paper Wasp | 45 | 22 | Fast hit-and-run hunter |
| Rival Ant | 35 | 7 | Raids food stores in groups |
| Termite | 50 | 6 | Territorial, patrols in formation |
| Antlion | 80 | 20 | Ambush with pull-trap pits |
| Parasitic Mite | 10 | 2 | Wanders, weak but numerous |

### Random Events

Rain, Drought, Tunnel Collapse, Cold Snap, Heat Wave, Toxic Fungus, Pesticide Spray, Enemy Raid, Earthquake, and Flash Flood — each with varying severity, warning announcements, and event combos.

---

## Audio System

The game features a synthesized audio system using the Web Audio API (no audio files needed):

**Sound Effects**: Dig, Build, Combat Hit, Combat Kill, Ant Hatch, Pheromone Mark, Event Warning, Event Start, Queen Damage, Button Click, Speed Change

**Ambient Sounds**: Underground Hum (deep drone), Rain (during rain/flood events), Surface Breeze (near surface)

All sounds are synthesized using oscillators, noise generators, and filters for a rich, responsive audio experience. Volume controls are available in the settings panel (Esc key).

---

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with App Router
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Rendering**: HTML5 Canvas 2D with custom particle system
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) + [Lucide Icons](https://lucide.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Audio**: Web Audio API (synthesized sounds)
- **Pathfinding**: Custom A* with octile heuristic
- **Build**: Bun runtime

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ or [Bun](https://bun.sh/)
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/smouj/FerroNest.git
cd FerroNest

# Install dependencies
bun install

# Start development server
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to start playing.

### Build for Production

```bash
bun run build
bun start
```

---

## Project Structure

```
FerroNest/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Pages deployment
├── public/
│   └── logo.svg                # Game logo
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Main game page with intro screen
│   │   ├── globals.css         # Global styles
│   │   └── api/
│   │       └── route.ts        # API routes
│   ├── components/
│   │   ├── game/
│   │   │   ├── GameCanvas.tsx  # Canvas renderer, camera, & input
│   │   │   ├── HUD.tsx         # Heads-up display with selected ant panel
│   │   │   ├── ToolBar.tsx     # Bottom toolbar with categorized tools
│   │   │   ├── SettingsPanel.tsx # Settings overlay (Esc)
│   │   │   └── FPSCounter.tsx  # Performance display
│   │   └── ui/                 # shadcn/ui components
│   ├── game/
│   │   ├── engine.ts           # Core simulation engine (mutation-based)
│   │   ├── renderer.ts         # Canvas 2D renderer with noise cache
│   │   ├── audio.ts            # Web Audio API sound system
│   │   ├── store.ts            # Zustand game state store
│   │   ├── ui-store.ts         # Zustand UI settings store
│   │   ├── types.ts            # TypeScript type definitions
│   │   └── constants.ts        # Game balance & configuration
│   ├── hooks/                  # Custom React hooks
│   └── lib/                    # Utility functions
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies & scripts
```

---

## Contributing

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Ideas for Contributions

- New enemy types with unique AI
- New chamber types and effects
- New pheromone types
- Biome system (desert, rainforest, tundra)
- Statistics dashboard
- Save/Load game state
- Achievement system

---

## License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.

---

<p align="center">
  <strong>FerroNest — Where signals become strategy.</strong>
</p>
