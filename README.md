# 🐜 FerroNest

**You don't give orders. You design signals.**

A strategic ant colony management game where you control a collective mind through pheromone signals. Build tunnels, manage castes, defend against predators, and evolve your colony — all through emergent AI driven by chemical communication.

[![Play Now](https://img.shields.io/badge/Play%20Now-GitHub%20Pages-2ea44f?style=for-the-badge&logo=github)](https://smouj.github.io/FerroNest)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](./LICENSE)

---

## 📸 Screenshots

> *Screenshots coming soon — the game features a rich Canvas 2D renderer with day/night cycles, fog of war, particle effects, and detailed ant/enemy sprites.*

---

## ✨ Features

- **🧪 Pheromone Signal System** — Paint chemical trails to guide your colony. No direct orders — design the signals, and the ants respond.
- **🐜 7 Ant Castes** — Queen, Worker, Scout, Soldier, Nurse, Builder, and Cultivator — each with unique AI, stats, and behaviors.
- **🧠 Colony Mind Abilities** — Charge consciousness and unleash powerful abilities like Work Surge, Total Alarm, and Chemical Fury.
- **🏰 10 Chamber Types** — Build Queen Chambers, Barracks, Fungus Gardens, Pheromone Labs, and more, each with unique effects.
- **⚔️ 8 Enemy Types** — Defend against Spiders, Wasps, Centipedes, Antlions, Rival Ants, and more with distinct AI behaviors.
- **🌧️ Dynamic Events** — Rain, droughts, earthquakes, pesticide sprays, and flash floods challenge your colony.
- **🌑 Day/Night Cycle & Fog of War** — Stars, moon, sun, and dynamic lighting affect surface visibility and ant behavior.
- **🧬 Evolution System** — Choose from 5 branches: Military, Agricultural, Explorer, Subterranean, and Chemical.
- **🗺️ Procedural Maps** — Every game generates a unique underground world with clay, sand, stone veins, roots, and water.
- **✨ Particle Effects** — Dust, spores, combat sparks, pheromone trails, rain, and ambient glow particles.
- **🎯 A\* Pathfinding** — Intelligent pathfinding with tunnel quality modifiers and 8-directional movement.

---

## 🎮 How to Play

### Controls

| Input | Action |
|-------|--------|
| **Left Click / Drag** | Use selected tool (excavate, build, mark pheromone) |
| **Right Click / Drag** | Pan camera |
| **Scroll Wheel** | Zoom in/out |
| **WASD / Arrow Keys** | Pan camera |
| **Space** | Pause / Resume |
| **1 / 2 / 3** | Set game speed |
| **P** | Toggle pheromone overlay |
| **M** | Toggle minimap |

### Game Flow

1. **Start** with a Queen, 6 Workers, and 1 Scout in an underground chamber
2. **Excavate** tunnels to expand your nest and reach the surface
3. **Mark pheromones** to direct ants toward food, excavation, or defense
4. **Build chambers** for specialized functions (brood, storage, barracks, etc.)
5. **Defend** against predators and survive environmental events
6. **Evolve** through 4 game phases: Survival → Expansion → Dominance → Empire

---

## ⚙️ Game Mechanics

### 🧪 Pheromone System

Pheromones are the core mechanic. Instead of selecting and commanding individual ants, you paint pheromone signals on the map. Ants detect and follow these signals based on their caste AI:

| Pheromone | Color | Effect |
|-----------|-------|--------|
| Collect | 🟢 Green | Workers gather nearby resources |
| Excavate | 🟠 Orange | Workers dig in marked area |
| Defend | 🔴 Red | Soldiers rush to position |
| Evacuate | 🟡 Yellow | All ants flee from area |
| Explore | 🔵 Blue | Scouts investigate area |
| Attack | 🟣 Purple | Soldiers go on offensive |
| Priority | 🔥 Red-Orange | Marks high-priority zone |
| Home | 🟤 Brown | Points toward queen chamber |
| Food | 🟡 Gold | Marks food trail |
| Danger | 🔴 Bright Red | Signals danger area |

Pheromones decay over time, diffuse to adjacent cells, and consume pheromone resources. **Pheromone Labs** boost signal strength by 30%.

### 🐜 Ant Castes

| Caste | HP | Speed | Attack | Role |
|-------|----|-------|--------|------|
| 👑 Queen | 250 | 0.25 | 8 | Lays eggs, emits home pheromone |
| ⛏ Worker | 35 | 0.70 | 3 | Gathers, excavates, delivers resources |
| 🔭 Scout | 22 | 1.40 | 2 | Explores, finds food, fast movement |
| ⚔ Soldier | 100 | 0.45 | 18 | Fights enemies, patrols |
| ♥ Nurse | 28 | 0.55 | 1 | Cares for brood, feeds larvae |
| 🏗 Builder | 45 | 0.55 | 5 | Builds chambers, carries heavy loads |
| 🌿 Cultivator | 28 | 0.45 | 2 | Tends fungus gardens |

Each ant has a **personality** (Diligent, Brave, Curious, Cautious, Aggressive, Social) that modifies their behavior, and individual **memory** tracking food sources, danger locations, and visited chambers.

### 🧠 Colony Mind

The Colony Mind charges over time based on ant loyalty. Spend consciousness to activate powerful abilities:

| Ability | Cost | Effect |
|---------|------|--------|
| **Work Surge** | 20 | Workers move 50% faster |
| **Total Alarm** | 30 | All soldiers rush to defend |
| **Perfect Route** | 25 | Optimal pathfinding for all ants |
| **Last Stand** | 40 | Workers block tunnels to protect queen |
| **Evacuation** | 50 | Emergency migration of queen and eggs |
| **Chemical Fury** | 60 | All ants attack with doubled ferocity |

### 🏰 Chambers

| Chamber | Cost | Effect |
|---------|------|--------|
| ♛ Queen Chamber | 5🪨 | Queen lays eggs here |
| ◎ Brood Chamber | 3🪨 1🧬 | Eggs develop 20% faster |
| ◉ Food Storage | 2🪨 | Food spoilage -50% |
| ❋ Fungus Garden | 3🪨 3🧬 | Produces fungus over time |
| ⚔ Barracks | 4🪨 2🧬 | Soldiers +20% attack nearby |
| ◈ Pheromone Lab | 3🪨 3🧬 | Pheromone strength +30% |
| ▼ Waste Chamber | 2🪨 | Contamination -60% nearby |
| ≈ Humidity Chamber | 3🪨 1🧬 | Stabilizes humidity +40% |
| ◇ Nursery | 2🪨 2🧬 | Brood survival +25% |
| ▤ Granary | 2🪨 1🧬 | Sugar/nectar storage +50% |

### 🌍 Environmental Systems

- **Day/Night Cycle** — Affects surface visibility, ant behavior, and ambient lighting
- **Fog of War** — Only areas near ants are visible; unexplored regions are hidden
- **Temperature** — Varies by depth; extreme temps damage brood
- **Humidity** — Affects fungus growth and chamber conditions
- **Contamination** — Builds up without waste chambers; damages brood
- **Water Levels** — Rain and floods can flood tunnels
- **Tunnel Quality** — Affects ant movement speed and fatigue

### ⚔️ Enemies

| Enemy | HP | Attack | Behavior |
|-------|----|--------|----------|
| 🕷 Wolf Spider | 70 | 14 | Hunts ants actively |
| 🪲 Ground Beetle | 120 | 8 | Territorial, attacks if close |
| 🐛 Centipede | 90 | 12 | Hunts in tunnels |
| 🐝 Paper Wasp | 45 | 22 | Fast aerial hunter |
| 🐜 Rival Ant | 35 | 7 | Raids food stores |
| 🦗 Termite | 50 | 6 | Territorial defender |
| 🕳 Antlion | 80 | 20 | Ambush predator |
| 🔬 Parasitic Mite | 10 | 2 | Wanders, weak but numerous |

### 🌧️ Random Events

Rain, Drought, Tunnel Collapse, Cold Snap, Heat Wave, Toxic Fungus, Pesticide Spray, Enemy Raid, Earthquake, and Flash Flood — each with varying severity and duration.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with App Router
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Rendering**: HTML5 Canvas 2D with custom particle system
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Pathfinding**: Custom A* with octile heuristic
- **Build**: Bun runtime

---

## 🚀 Getting Started

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
# or
npm install

# Start development server
bun dev
# or
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start playing.

### Build for Production

```bash
bun run build
bun start
```

### Static Export for GitHub Pages

```bash
# The project is configured for static export
# The GitHub Actions workflow handles this automatically
bun run build
```

---

## 📁 Project Structure

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
│   │   ├── page.tsx            # Main game page
│   │   ├── globals.css         # Global styles
│   │   └── api/
│   │       └── route.ts        # API routes
│   ├── components/
│   │   ├── game/
│   │   │   ├── GameCanvas.tsx  # Canvas renderer & input handler
│   │   │   ├── HUD.tsx         # Heads-up display overlay
│   │   │   └── ToolBar.tsx     # Bottom toolbar with tools
│   │   └── ui/                 # shadcn/ui components
│   ├── game/
│   │   ├── engine.ts           # Core game simulation engine
│   │   ├── renderer.ts         # Canvas 2D renderer & particles
│   │   ├── store.ts            # Zustand state store
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

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Ideas for Contributions

- 🎨 New enemy types with unique AI
- 🏗️ New chamber types and effects
- 🧪 New pheromone types
- 🎵 Sound effects and music
- 🌍 Biome system (desert, rainforest, tundra)
- 📊 Statistics dashboard
- 💾 Save/Load game state
- 🏆 Achievement system

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.

---

<p align="center">
  <strong>🐜 FerroNest — Where signals become strategy.</strong>
</p>
