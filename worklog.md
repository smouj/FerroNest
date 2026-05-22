# FerroNest Project Worklog

---
Task ID: 1
Agent: Main Agent
Task: Complete overhaul of FerroNest game - professional edition

Work Log:
- Analyzed existing codebase (types.ts, constants.ts, engine.ts, renderer.ts, store.ts, GameCanvas.tsx, HUD.tsx, ToolBar.tsx, page.tsx)
- Rewrote types.ts with new features: AntMemory, AntPersonality, InfluenceCell, EvolutionUpgrade, fog of war (explored, lightLevel, tunnelQuality, soilNutrients), new castes states (Resting, Returning, Harvesting, Patrolling, Cultivating), new resource types (Nectar, LeafFragments), new pheromone types (Home, Food, Danger), new enemy types (Antlion, Mite), new enemy behaviors, new event types (Earthquake, Flood), ColonyScore, ambient light, etc.
- Rewrote constants.ts with: larger map (100x70), more terrain types (Clay, Sand), personality modifiers, phase thresholds, fog settings, score values, better ant stat balancing with fatigue/vision/pheromone emission, 10 chamber types, 10 pheromone types, 8 enemy types with behavior/aggro/loot, 10 event types with severity
- Rewrote engine.ts with: A* pathfinding replacing BFS, procedural map generation with smooth noise, influence map system, priority-based ant AI (7 castes with distinct behaviors), personality modifiers affecting behavior, ant memory system (food sources, danger, home), fatigue system, enemy behavior system (Hunt, Raid, Ambush, Territorial), pheromone diffusion, fog of war, temperature/humidity simulation, contamination system, colony mind abilities, colony scoring, game phase progression
- Rewrote renderer.ts with: fog of war rendering, day/night cycle with sun/moon/stars, animated grass blades, terrain variation with smooth noise, wall shadow effects with gradients, detailed ant rendering with body segments/legs/antennae/mandibles, carrying indicators, combat sparks, digging particles, pheromone vapor particles, spore particles, glow particles, detailed enemy rendering (spiders with fangs, wasps with stinger/stripes, centipede segments, antlion jaws), minimap rendering, chamber labels with background pills, surface flowers/plants, stone cracks
- Rewrote GameCanvas.tsx with: drag-painting support for pheromones/excavation, minimap integration, hover cell info, keyboard shortcuts (P for pheromone view, M for minimap)
- Rewrote HUD.tsx with: time-of-day indicator, colony score, caste breakdown tooltip, hovered cell coordinates, more resource types displayed
- Rewrote ToolBar.tsx with: Select tool, keyboard shortcut hints in tooltips, pheromone view toggle, minimap toggle, ability active duration display, color-coded pheromone buttons
- Rewrote page.tsx with: professional intro screen with fade animation, victory modal with score, cleaner game over screen
- Updated store.ts with new actions (toggleMinimap, setHoveredCell, setSelectedAnt)
- Fixed GamePhase import in constants.ts
- Fixed lint errors (setState in effect)
- Created GitHub repository: https://github.com/smouj/FerroNest
- Pushed all code with professional README, MIT License, GitHub Actions workflow for Pages deployment
- Enabled GitHub Pages: https://smouj.github.io/FerroNest

Stage Summary:
- Complete professional overhaul of the FerroNest game
- A* pathfinding, emergent AI with personalities, pheromone diffusion, fog of war, day/night cycle, minimap
- 8 enemy types with distinct behaviors, 10 chamber types, 10 pheromone types, 10 event types
- Professional GitHub repository with README, topics, and GitHub Pages deployment
- Repository URL: https://github.com/smouj/FerroNest
- GitHub Pages: https://smouj.github.io/FerroNest

---
Task ID: 5
Agent: Emoji Replacement Agent
Task: Replace ALL emojis in the codebase with proper Unicode symbols or Canvas-drawn elements

Work Log:
- Replaced all emoji RESOURCE_ICONS in HUD.tsx (🍎🥩🍬🍄💧🧪🧬🪨🍯🍃 → ●◆◇✦▽◎⬡■◉♣)
- Replaced emoji CASTE_ICONS in HUD.tsx (🔭→◎, 🏗→▣, 🌿→✦)
- Replaced time icons in HUD.tsx (☀→◉ for day, 🌙→○ for night)
- Replaced ant count emoji in HUD.tsx (🐜→⊕)
- Replaced queen icon emoji in HUD.tsx CASTE_ICONS and health display (♛→▲)
- Replaced pause icon in HUD.tsx and ToolBar.tsx (⏸→‖)
- Replaced warning icon in HUD.tsx (⚠→△)
- Replaced chamber cost emojis in ToolBar.tsx tooltip (🪨→■, 🧬→⬡)
- Replaced active ability indicator in ToolBar.tsx (⚡→✦)
- Replaced queen crown emoji in renderer.ts with Canvas path-drawn crown (fillText('♛') → path-based crown with fill+stroke)
- Replaced chamber icons in constants.ts (QueenChamber ♛→▲, FungusChamber ❋→✦)
- Replaced FungusChamber icon in page.tsx intro screen (❋→✦)
- Ran comprehensive emoji scan confirming no emojis remain in the codebase
- Lint passes cleanly, dev server compiles without errors

Stage Summary:
- All emojis removed from the entire codebase
- Resource icons, caste icons, time icons, UI controls, and chamber labels now use proper Unicode symbols
- Queen crown in renderer now drawn with Canvas path operations instead of text characters
- Consistent symbol choices across HUD, ToolBar, constants, renderer, and intro page

---
Task ID: 7, 8, 9
Agent: AI Improvement Agent
Task: Improve Camera System (7), Ant AI (8), Enemy AI (9)

Work Log:

### Task 7: Smooth Camera System
- Added `cameraTargetRef` and `zoomTargetRef` refs to store desired camera position and zoom level
- Implemented smooth camera interpolation (lerp) in the game loop with `smoothFactor = 0.12` for position and `smoothZoomFactor = 0.1` for zoom
- Changed WASD/arrow key panning to update the camera target instead of current position, with continuous panning when keys are held (via `keysHeld` ref with keydown/keyup tracking)
- Changed right-drag panning to update the camera target (stored from current target at drag start)
- Added smooth zoom interpolation with zoom-toward-cursor feature: when zooming, adjusts camera position so the world point under the mouse stays in place
- Only updates store when changes are significant (>0.05 pixels for camera, >0.001 for zoom) to avoid unnecessary re-renders

### Task 8: Ant AI Improvements
- **Worker AI**: Added emergency danger pheromone emission when soldiers die nearby; smart delivery to closest food storage/granary/queen chamber; foraging efficiency - workers remember last food pickup location and return there; resource location memory checked before random wandering; delivery locations saved to visited chambers memory
- **Scout AI**: Systematic exploration using expanding spiral pattern (based on experience and ant ID for unique patterns) instead of pure random wandering; danger reporting emits stronger danger + defend pheromones and always flees immediately when enemies spotted; trail marking increased (every 5 ticks instead of 8)
- **Soldier AI**: Retreat behavior when health < 20% (flee to barracks or queen chamber while emitting defend pheromone); formation system - soldiers spread out around enemies using angular offsets; patrol routes between key chambers (queen chamber, entrance, barracks) preferring the farthest point for coverage
- **Nurse AI**: Priority feeding - brood sorted by stage (pupae > larvae > eggs), then progress (closest to hatching), then health (lowest first); temperature management - nurses move brood from extreme temperature chambers to better nursery/brood chambers
- **Builder AI**: Smart excavation with scoring system - prefers unexplored areas (+3), cells near surface deposits (+2), softer terrain, and cells near existing tunnels; added `determineNeededChamber()` helper that identifies which chamber type the colony needs most based on ant count, brood count, and enemy presence
- **Fixed `findNearestChamber`**: Now finds the nearest chamber cell from a given position instead of just returning the center of all chambers of that type

### Task 9: Enemy AI Improvements
- **Hunting enemies (Spider, Wasp)**: Added `findWeakestAnt()` function with scoring system (prefers closer, weaker ants; queen is top target, nurses are easy prey, soldiers are avoided); Spider ambush behavior - waits until prey is very close before striking; retreat when health < 25% - flee away from colony entrance; Wasp hit-and-run - after getting close to prey, immediately retreats in opposite direction
- **Raiding enemies (RivalAnt)**: Target resource chambers (food storage, granary) specifically instead of just colony entrance; steal food mechanic - when reaching food storage, reduce colony resources and flee; group behavior - rival ants coordinate by blending their movement target with nearby rivals' center position
- **Territorial enemies (Beetle, Termite)**: Defined patrol zone (radius 6) around current position; warning display - when ants enter outer aggro range, move aggressively toward them but don't attack yet (emit danger pheromone); only attack when ants enter inner range (30% of aggro range)
- **Ambush enemies (Antlion)**: Sand trap effect - pull mechanic that draws nearby ants toward the antlion (15% pull strength per tick); emit danger pheromone at trap location; antlion stays mostly stationary as a trap

Stage Summary:
- All three tasks completed successfully
- Camera is now smooth with interpolated panning and zoom-toward-cursor
- Ant AI is significantly smarter with memory-based foraging, systematic scouting, soldier formation/tactical retreat, priority nursing, and smart excavation
- Enemy AI has prey selection, ambush tactics, food stealing, coordinated raids, warning displays, and antlion pull mechanics
- Lint passes cleanly, dev server compiles without errors

---
Task ID: 10, 11
Agent: Visual Polish & Game Balance Agent
Task: Polish Visual Rendering (10) and Improve Game Logic/Stats Balance/Algorithms (11)

Work Log:

### Task 10: Polish Visual Rendering

#### A. Better Tunnel/Chamber Visuals
- Added subtle floor texture to tunnels with noise-based variation (dirt particles scattered on floor)
- Added chamber floor tints based on chamber type: FungusChamber slightly green-tinted, Barracks slightly red-tinted, FoodStorage warm-tinted, WasteChamber olive-tinted, HumidityChamber blue-tinted, NurseryChamber pink-tinted
- Enhanced ambient occlusion at wall transitions: deeper gradient shadows (0.38 alpha from 0.25), longer gradient spread (4px from 3px), stronger side shadows, added corner darkening for top-left and top-right wall junctions
- Improved tunnel quality visual with slightly stronger overlay

#### B. Better Surface Rendering
- Added varied grass: yellow/dead grass (deterministic hash-based, ~15% of grass), thick triple-blade clusters for some grass blades
- Added small rocks/pebbles on surface: elliptical shapes with highlights, placed every 3 columns when hash threshold met
- Replaced dot-based flowers with multi-petal rendering: 4-5 petal flowers using ellipse shapes, stems, and flower centers with color variety (gold, red, pink)
- Improved root rendering: added branching roots (branch 1 at depth 20, branch 2 for stronger roots), thinner branch strokes with lower opacity

#### C. Better Resource Deposit Rendering
- Shape variety by resource type: diamond shape for sugar, hexagon for water, square for compact_earth, circle for all others
- Added amount indicator fill bar below each deposit: background bar + colored fill bar that changes color at low amounts (green/orange/red)

#### D. Better Minimap
- Clearer terrain colors: brighter more distinct colors (e.g., SurfaceGrass #3d7a32, SurfaceDirt #7a5a3d, Tunnel #3a2e22, Water #2980D0)
- Added Clay, Sand, and Roots colors on minimap
- Added chamber highlights: bright colored dots at chamber centers with glow rings
- Added border (1.5px with warmer gold color) and "MAP" label in top-left corner

#### E. Particle Polish
- Added 'bubble' particle type for water areas that floats upward with wobble
- Improved glow/pheromone particle rendering: now uses radial gradients (center color to transparent) instead of solid circles
- Bubble particles render as hollow circles with highlight dot
- Added water bubble ambient particles spawning in Water terrain and high water-level cells

### Task 11: Improve Game Logic, Stats Balance, and Algorithms

#### A. Better Stats Balance
- Dynamic queen egg laying rate: interval scales with food supply (foodSupplyFactor = food/30), laying interval ranges from 40-80 ticks (faster with more food)
- Smarter caste ratios: soldier cap now responds to threat level (enemyThreatLevel = enemy count), soldier ratio cap scales up to 30% under heavy threat
- Reduced per-tick hunger increase from 0.0008 to 0.0005

#### B. Better Algorithms
- Optimized pheromone diffusion: added early return when pheromoneMap is empty
- Optimized influence map update: only updates cells near ants (radius 3) and enemies (radius 6), not entire 100x70 grid
- Optimized fog of war light levels: only updates surface band + underground cells near ants (radius 6), uses deduplication Set to avoid redundant updates
- Contextual event spawning: rain weighted 3x higher after drought, enemy raids 2x/3x more likely when colony is large, cold snap 2x during heat wave, flood 2.5x during rain

#### C. Game Balance
- Dynamic brood cap: maxBrood = 20 + floor(livingAnts * 0.5) (was fixed at 20)
- Enemy scaling: enemies scale with colony size - stronger enemy types available sooner, enemy health/attack scale up when colony is large (colonyScale = livingAnts/15)
- Resource scarcity: surface deposit spawning probability reduced when many deposits are depleted, new deposits have reduced amounts under scarcity conditions

Stage Summary:
- Visual polish: floor textures, chamber tints, enhanced AO, varied grass/rocks/flowers, branching roots, deposit shape variety with fill bars, improved minimap with chamber dots and MAP label, radial gradient particles and bubble particles
- Game balance: dynamic egg rate, threat-responsive caste ratios, reduced hunger, optimized algorithms (influence map, fog of war, pheromone diffusion), contextual events, scaling brood cap/enemy difficulty/resource scarcity
- Lint passes cleanly, no errors

---
Task ID: 3
Agent: Icon Replacement Agent
Task: Replace ALL unicode symbols with proper Lucide React icons in HUD.tsx, ToolBar.tsx, and page.tsx

Work Log:

### HUD.tsx
- Replaced RESOURCE_ICONS from `Record<string, string>` to `Record<string, ReactNode>` with Lucide components: food→Wheat, protein→Beef, sugar→Gem, fungus→Clover, water→Droplets, pheromones→FlaskConical, biomass→Leaf, compactEarth→Mountain, nectar→Flower2, leafFragments→Leaf
- Replaced CASTE_ICONS from string map to ReactNode map: Queen→Crown, Worker→Hammer, Scout→Eye, Soldier→Sword, Nurse→Heart, Builder→Wrench, Cultivator→Sprout
- Time of day: ◉/○ → Sun/Moon icons
- Pause indicator: ‖ → Pause icon
- Queen health: ▲ → Crown icon, ✗ → X icon
- Ant count: ⊕ → Users icon
- Brood: ◎ → Egg icon
- Enemies: ⚔ → Skull icon
- Event warning: △ → AlertTriangle icon

### ToolBar.tsx
- TOOLS icon field changed from string to ReactNode: Dig→Hammer, Build→Building2, Mark→Pen, Focus→Target, Evac→LogOut, Defend→Shield, Expand→Maximize2, Select→MousePointer2
- Pause/Play: ‖/▶ → Pause/Play icons
- Chamber cost: ■/⬡ → Square/Hexagon icons
- Pheromone view: ◈ → Eye icon
- Minimap: ◫ → Map icon
- Mind ability active: ✦ → Sparkles icon

### page.tsx
- Intro screen feature grid: all 9 unicode symbols replaced with Lucide icons (Hammer, Building2, Pen, Shield, Egg, Sword, Sprout, Heart, Droplets)
- Added shrink-0 to prevent icon shrinking in flex layout

### Verification
- bun run lint passes cleanly
- Dev server compiles without errors
- Unicode symbol scan confirms zero remaining symbols in the 3 files
- Emoji scan confirms zero remaining emojis

Stage Summary:
- All unicode symbols replaced with proper Lucide React icon components across HUD.tsx, ToolBar.tsx, and page.tsx
- Icons are color-coded with Tailwind classes, consistently sized (w-3 h-3 for HUD/toolbar, w-3.5 h-3.5 for intro)
- Note: Mushroom icon not available in lucide-react, used Clover as closest alternative for fungus resource
- No game logic, rendering engine, or other code files modified

---
Task ID: 4
Agent: Renderer & Camera Improvement Agent
Task: Improve FerroNest Renderer: Textures, Scene, Camera System

Work Log:

### 1. Better Terrain Textures (renderer.ts)

#### Depth-based gradient overlays
- Added progressive blue-tint overlay for underground cells deeper than 20 rows from surface (`rgba(10, 15, 40, blueTint)`)
- Underground background now uses a gradient that transitions from `#0c0a06` at surface to `#040308` at depth (blue-tinted deep underground)
- Dirt terrain now uses 4-stage depth gradient instead of 3: shallow (0-10), medium (10-25), deep (25-45), and very deep (45+), with blue tint emerging at depth
- Added soil layer transition lines as subtle horizontal lines at depth boundaries (rows 10, 25, 45)

#### Improved stone rendering
- Added second crack direction (anti-diagonal) with separate hash seed
- Added 3 types of mineral vein highlights: quartz (whitish, rgba(200,200,210)), iron oxide (reddish, rgba(180,80,50)), copper (greenish, rgba(80,160,100))
- Veins drawn as multi-segment paths for more natural appearance

#### Clay/Sand textures
- Clay: Added fine horizontal grain lines with noise-based placement, plus darker specks
- Sand: Added scattered sand grain dots with lighter/darker variation using noise function

#### Root systems
- Completely revamped root rendering with organic thickness variation (base thickness varies with hash)
- Main root drawn with tapered line width (0.8 + hash * 1.2)
- Added left branch with sub-branch, right branch with sub-branch, and tiny rootlets from main root
- All sub-branches use progressively thinner lines and lower opacity
- Root spacing changed from every 5 to every 4 columns for more coverage

#### Moss/fungi details
- Added moss patches near surface (depth 0-8): elliptical shapes with green tint that fades with depth
- Added fungi spots in deep areas (depth > 20): small circular spots with beige color, more visible with increasing depth

### 2. Enhanced Chamber/Tunnel Visuals

#### Chamber floor patterns with distinct visual identities
- NurseryChamber/BroodChamber: soft pinkish glow `rgba(220, 160, 180, pulse)`
- FungusChamber: green scattered fungus dots on floor, stronger green glow
- Barracks: red-tinted edges with stronger red glow `rgba(160, 40, 20, pulse)`
- FoodStorage/GranaryChamber: warm golden glow `rgba(200, 170, 80, pulse)`
- QueenChamber: enhanced amber glow
- All chamber base colors adjusted for more distinct tints

#### Tunnel depth shading
- Added rougher texture overlay for tunnel cells far from queen chamber (checks 3-cell radius for nearby queen chamber)
- Rough areas get scattered dirt particles with noise-based placement

#### Chamber borders (carved archway effect)
- New `renderChamberBorder()` function draws carved archway borders at wall-to-floor transitions
- Top borders: brown arch color + subtle highlight line below
- Side borders: brown arch color + subtle highlight line inward
- All 4 corners get darker stones for extra depth
- Both bottom corners now rendered (was only top corners before)

### 3. Improved Water Rendering

#### Animated water surface
- Water cells now use dual sin-wave animation (`wave1` + `wave2`) with different frequencies
- Wave highlights rendered as semi-transparent blue overlays that shift with time
- Bright wave crest lines appear when wave intensity > 0.7, animated with sin-based drift

#### Water reflections
- Faint elliptical light reflections on water surfaces when reflection phase > 0.8
- Reflections slowly rotate and drift with tick-based animation

#### Underground water seepage
- Water cells adjacent to non-water underground cells now show seepage effects:
  - Bottom seepage: translucent blue strip below water cell
  - Drip drops: small elliptical drops below water when sin threshold met
  - Side seepage: translucent blue strips on left/right non-water neighbors
- All seepage effects use time-based animation for dripping motion

### 4. Better Day/Night Cycle

#### Smooth sky color transitions
- Completely rewrote `skyTopColor()` and `skyBotColor()` functions to use `timeOfDay` instead of `ambientLight`
- 8 distinct time phases: deep night → night-to-dawn → dawn → dawn-to-noon → noon → noon-to-dusk → dusk → dusk-to-night
- Dawn: orange/pink sky (top: 65-120r, 30-100g, 45-125b)
- Noon: bright blue (top: 40r, 150g, 205b)
- Dusk: orange/red (top: 130-150r, 100-50g, 125-45b)
- Night: dark blue-black (top: 5r, 5g, 15b)
- Horizon colors (skyBot) are warmer/brighter at dawn/dusk

#### Colored underground light
- New `renderUndergroundLight()` function adds warm/cool light to entrance tunnels
- During daytime (tod 0.15-0.85): warm golden light seeps into top 8 underground rows
- During night/dusk: cool blue light with half intensity
- Light fades with depth from surface

#### Surface fog/mist
- New `renderSurfaceFog()` function adds layered fog effect around dawn (tod 0.2-0.35)
- 3 layers of fog with different heights and drift speeds
- Each layer uses a gradient from transparent → semi-opaque → transparent
- Fog drifts slowly with sin-based animation

### 5. Camera Improvements (GameCanvas.tsx)

#### Camera bounds
- New `clampCamera()` function prevents camera from going outside map boundaries
- Allows 30% viewport over-scroll at edges, then clamps
- Clamping applied to camera target every frame

#### Edge scrolling
- When mouse is within 40px of screen edges, auto-scrolls in that direction
- Scroll speed scales with proximity to edge (faster when closer)
- Speed adjusted for current zoom level
- Disables follow mode when edge scrolling activates

#### Follow mode (press F)
- F key cycles through: off → queen → selected ant → off
- Follow queen: camera tracks the queen ant's position
- Follow selected: camera tracks the selected ant, falls back to queen if selected ant is gone
- "FOLLOW Q" / "FOLLOW" indicator displayed in top-right corner when active
- Any manual camera movement (WASD, drag, edge scroll) turns off follow mode

#### Smooth zoom with better feel
- Increased smooth factor from 0.12 → 0.15 for position
- Increased smooth zoom factor from 0.1 → 0.14 for zoom
- Both feel more responsive while still smooth

#### Minimap click
- Clicking on the minimap moves the camera to that world location
- Calculates relative click position within minimap bounds
- Centers camera on the clicked world position
- Disables follow mode when minimap is clicked

### 6. Particle Improvements

#### New particle type: 'drip'
- Elongated elliptical shape falling downward (vy += 0.06)
- Used for water drip effects near water cells

#### Enhanced ambient particles
- Ambient dust: increased frequency (0.08 → 0.12), more visible, slight horizontal wobble, varied sizes
- Fungus spores: more frequent (0.02 → 0.04), brighter green color, larger size with variation
- Queen chamber warmth: more frequent (0.015 → 0.03), warm amber color, varied sizes
- Water drips: new particle type spawned near water cells with tunnels below
- Water bubbles: kept existing bubble particles
- Nursery warmth: new pink glow particles in nursery/brood chambers

#### MAX_PARTICLES increased from 500 → 600

### Technical Notes
- All existing function signatures and exports preserved
- `renderMinimap` export still works as before
- `state.currentTick` used consistently (not `state.tick`)
- Type alias `Cell` added at bottom of renderer.ts to avoid import issues
- No changes to engine.ts, store.ts, types.ts, constants.ts
- Lint passes cleanly, dev server compiles without errors

Stage Summary:
- Renderer significantly enhanced: depth-based blue tint, smooth soil transitions, mineral veins in stone, clay/sand grain patterns, organic branching roots, moss/fungi, carved chamber borders, distinct chamber glows, animated water with reflections and seepage, rich day/night sky transitions, underground light seepage, dawn fog/mist, and many new particle effects
- Camera system upgraded: map bounds, edge scrolling, follow mode (F key), faster smooth interpolation, and minimap click-to-navigate
- All changes limited to renderer.ts and GameCanvas.tsx only
- Lint passes cleanly, no errors

---
Task ID: 1+3
Agent: Game Speed & Sound Agent
Task: Fix Game Speed + Add Sound Effects System

Work Log:

### Problem 1: Game Speed Too Fast at 1x

The game was running 30 simulation ticks per second at 1x speed, with TICKS_PER_DAY=600, making a full day pass in just 20 seconds. This was way too fast for comfortable gameplay.

**Fix Applied** - Changed timing so 1x speed = ~60 seconds per day:

In `constants.ts`:
- `TICKS_PER_DAY`: 600 → 1800 (3x more ticks per day)
- `DAY_DURATION_SECONDS`: 10 → 60 (1 real minute = 1 game day at 1x)
- `TICK_RATE_MS`: Kept at 1000/30 (30 ticks/sec render rate unchanged)
- Scaled ALL timing-dependent values by 3x:
  - `BROOD_TIMING.eggToLarva`: 120 → 360
  - `BROOD_TIMING.larvaToPupa`: 200 → 600
  - `BROOD_TIMING.pupaToHatch`: 160 → 480
  - `BROOD_TIMING.foodPerLarvaPerTick`: 0.008 → 0.003 (adjusted for more ticks)
  - All `EVENT_INFO` durations: multiplied by 3
  - All `MIND_ABILITIES` cooldowns and durations: multiplied by 3
  - `PHEROMONE_SETTINGS.decayRate`: 0.0008 → 0.0003 (slower decay with more ticks)
  - All `ANT_STATS` maxAge values: multiplied by 3
  - All `ANT_STATS` foodConsumption: divided by 3 (consumed per tick, more ticks now)
  - All `ANT_STATS` proteinConsumption: divided by 3
  - `EVENT_SETTINGS.warningTicksBefore`: 150 → 450
  - `ENEMY_AI.spiderWebCooldown`: 300 → 900
  - `COMBAT_SETTINGS.casualtyReportWindow`: 100 → 300

In `GameCanvas.tsx`:
- Changed max ticks calculation: `state.speed * 3` → `state.speed * 2` (reduce burst processing)

### Problem 2: Add Sound Effects System

Created new file: `/home/z/my-project/src/game/audio.ts`

**Sound effects (short, responsive)**:
- `dig` - Soft earth-digging sound (low freq noise burst + filter sweep)
- `build` - Satisfying placement sound (ascending sine tone + square click overlay)
- `combat_hit` - Sharp impact (sine thump + bandpass noise burst)
- `combat_kill` - Victory chime (ascending C5-E5-G5 arpeggio)
- `ant_hatch` - Soft pop/chirp (sine with frequency sweep)
- `pheromone_mark` - Chemical spray sound (bandpass noise sweep with high Q)
- `event_warning` - Ominous alert (descending sawtooth + filtered second beep)
- `event_start` - Impact sound (bass sine hit + rising sawtooth)
- `queen_damage` - Alarming tone (triple square wave beep pattern at 880Hz)
- `button_click` - UI click (short sine at 1000Hz)
- `speed_change` - Whoosh sound (bandpass noise with frequency sweep)

**Ambient sounds (looping, volume-controlled)**:
- `underground_hum` - Deep underground ambience (very low filtered noise at 80Hz)
- `rain` - Rain falling (dual-layer: bandpass at 3kHz + highpass at 2kHz)
- `surface_breeze` - Gentle wind (low filtered noise at 400Hz)

**Implementation details**:
- Uses Web Audio API with AudioContext, GainNode, BiquadFilterNode, OscillatorNode
- Master volume control (0-1) with separate SFX and Ambient gain nodes
- All sounds are synthesized (no audio files needed)
- Sound throttling at 150ms per sound name to prevent audio spam
- AudioContext auto-resumes if suspended (browser autoplay policy)
- `initAudio()` called on first user click in GameCanvas
- `updateAmbient()` called in game loop to manage ambient sound state
- Rain starts during rain/flood events, underground hum when camera is deep, surface breeze when near surface
- Ambient sounds fade out gracefully over 0.5 seconds when stopping

**Integration in engine.ts**:
- Imported `playSound` from `./audio`
- Ant hatches → `playSound('ant_hatch')` in `updateBrood()`
- Combat hits → `playSound('combat_hit')` in `processCombat()` (throttled)
- Queen takes damage → `playSound('queen_damage')` in `processCombat()`
- Enemy defeated → `playSound('combat_kill')` in `processCombat()`
- Event warning → `playSound('event_warning')` in `maybeSpawnEvent()`
- Event starts → `playSound('event_start')` in `updateEvents()`

**Integration in GameCanvas.tsx**:
- `initAudio()` called on first mousedown interaction
- Tool actions play sounds: dig, build, pheromone_mark
- Ambient sounds updated via `updateAmbient()` in game loop

**Sound controls in ToolBar.tsx**:
- Added mute/unmute button with Volume2/VolumeX icons
- Volume slider popup on hover (range input 0-100%)
- Mute state tracked with useState
- Play button_click sound on mute toggle
- Icons change color when muted (red tint)

Stage Summary:
- Game speed fixed: 1 day now takes ~60 seconds at 1x speed (was 20 seconds)
- All timing values scaled by 3x for consistent gameplay at new pace
- Full Web Audio API sound system with 11 SFX and 3 ambient sounds
- Sound effects triggered from game engine at key moments
- Ambient sounds auto-play based on game state (rain, underground, surface)
- Volume controls (mute + slider) added to toolbar
- Lint passes cleanly, no errors

---
Task ID: 4
Agent: UI/UX Improvement Agent
Task: Major UI/UX Improvements - Better Menus, Panels, Polish

Work Log:

### 1. UI Settings Store (`src/game/ui-store.ts`)
- Created new zustand store for UI-only state (separate from game engine)
- Stores: difficulty (easy/normal/hard), masterVolume, sfxVolume, ambientVolume (0-100 each)
- Stores: cameraSmoothPanning, autoFollowQueen, showFpsCounter (booleans)
- Stores: minimapPosition (bottom-right/top-right), settingsOpen (boolean)
- All actions for setting each value plus toggleSettings helper

### 2. Improved Intro Screen (`src/app/page.tsx`)
- **Animated ant SVG**: Drew a complete ant using SVG (body, thorax, head, abdomen, antennae, eyes, legs, mandibles) with CSS keyframe animations for walking (antWalk: moves left to right) and leg movement (antLegs1/antLegs2: alternating rotation)
- **Version number**: Added "v1.0.0" in small mono text at top
- **Difficulty selector**: Easy/Normal/Hard buttons with descriptions and color-coded selection (emerald/amber/red gradients), stored in UI store
- **Better visual hierarchy**: Larger title (text-8xl), better spacing, more dramatic gradient text
- **Sequential fade-in**: 6 sections (0-5) fade in sequentially with 200ms intervals using sectionIndex state and CSS transitions (opacity + translateY)
- **Background particles**: Canvas-based floating particles (60 particles, amber and green hues for dust/spores), floating upward with gentle horizontal drift
- **Credits line**: "A colony simulation by FerroNest" in small text at bottom
- **Controls section**: Updated Esc key reference to show "Settings"
- **Fade-out animation**: Transition duration increased to 500ms

### 3. Better HUD (`src/components/game/HUD.tsx`)
- **Selected Ant Panel** (right side, appears when ant selected via Select tool):
  - Caste icon + name header with close button
  - Health bar (color: green/amber/red based on percentage)
  - Hunger bar (color: green/amber/red based on percentage)
  - Fatigue bar (color: blue/purple/red based on percentage)
  - State with color-coded text (15 different states)
  - Age in days
  - Personality (capitalized)
  - Carrying item amount (or dash if not carrying)
  - Experience level (calculated from experience/50)
- **Better resource bar**: Added category-colored backgrounds behind each resource:
  - Food category (amber): food, protein, sugar, fungus, nectar, leafFragments
  - Building category (brown/yellow): compactEarth, biomass
  - Chemical category (purple): pheromones
  - Water category (blue): water
- **Day/Night arc indicator**: SVG arc showing sun/moon position along a curved path
  - Quadratic bezier arc from left (dawn) to right (dusk)
  - Color changes: amber for dawn, orange for dusk, yellow for day, dark blue for night
  - Glow effect around the indicator dot
  - Horizon line drawn for reference

### 4. Better ToolBar (`src/components/game/ToolBar.tsx`)
- **Tool categories**: Tools grouped into 3 categories with labels:
  - "Actions" (amber): Dig, Build
  - "Pheromones" (purple): Mark, Focus, Evac, Defend
  - "Other" (gray): Expand, Select
  - Category labels shown on lg+ screens with separators between groups
- **Keyboard shortcut hints**: More prominent shortcut badges on each tool button
  - Absolute positioned badge at top-right corner of button
  - Active tool: amber-500 background with black text
  - Inactive tool: amber-900/40 background with muted text
- **Active tool highlight**: Brighter and more distinct visual treatment:
  - Amber-700 background (was default variant)
  - Box shadow glow: shadow-[0_0_8px_rgba(180,83,9,0.5)]
  - Ring effect: ring-1 ring-amber-500/50
- **Resource cost preview**: When hovering over chamber buttons in Build tool context panel:
  - Earth cost shown with green check or red X based on affordability
  - Biomass cost shown with green check or red X based on affordability
  - Cost icons (Square for earth, Hexagon for biomass) with color change
- **Settings button**: Added gear icon button in view toggles section with "Settings (Esc)" tooltip

### 5. Settings Panel (`src/components/game/SettingsPanel.tsx`)
- Semi-transparent overlay (bg-black/70 with backdrop-blur)
- **Audio section**: Master/SFX/Ambient volume sliders (0-100, step 5) with numeric value display
- **Camera section**: Smooth panning toggle, Auto-follow queen toggle
- **Display section**: Show FPS counter toggle, Minimap position selector (Bottom/Top buttons)
- **Difficulty section** (read-only): Shows current difficulty with color, "(set at game start)" note
- **Action buttons**: Resume (amber, Play icon), New Colony (red outline, RotateCcw icon)
- Uses shadcn/ui components: Card, Slider, Switch, Label, Button, Separator
- **Esc key** handler in page.tsx toggles settings panel

### 6. FPS Counter (`src/components/game/FPSCounter.tsx`)
- Toggleable via settings (showFpsCounter)
- Shows current FPS with color coding: red (<20), amber (<40), green (>=40)
- Shows living ant count
- Shows current tick number
- Uses requestAnimationFrame loop for FPS measurement (updated every second)
- Positioned at top-left below HUD bar

### Technical Notes
- Created new file: `src/game/ui-store.ts` (UI settings zustand store)
- Created new file: `src/components/game/SettingsPanel.tsx`
- Created new file: `src/components/game/FPSCounter.tsx`
- Modified: `src/app/page.tsx` (intro screen, settings wiring, FPS counter)
- Modified: `src/components/game/HUD.tsx` (selected ant panel, resource bgs, day/night arc)
- Modified: `src/components/game/ToolBar.tsx` (categories, shortcuts, active glow, cost preview)
- Did NOT modify: engine.ts, renderer.ts, store.ts, types.ts, constants.ts
- CSS animations for ant walking use dangerouslySetInnerHTML style tag (avoids styled-jsx scoping issues)
- Lint passes cleanly, no errors
- Dev server compiles without errors

Stage Summary:
- Comprehensive UI/UX improvements across all major UI components
- Intro screen: animated SVG ant, difficulty selector, background particles, sequential fade-in, version and credits
- HUD: detailed selected ant panel, color-coded resource categories, day/night arc indicator
- ToolBar: categorized tools, prominent shortcuts, active tool glow, affordability preview
- Settings panel: full-featured overlay with audio/camera/display settings, accessible via Esc key
- FPS counter: toggleable performance display with ant count and tick number
- All new UI state in separate zustand store (ui-store.ts), keeping game engine untouched

---
Task ID: 5
Agent: Performance Optimization Agent
Task: Performance Optimization - Engine and Renderer

Work Log:

### 1. Engine: Remove Deep Clone in gameTick() (Critical Fix)

**Before**: `gameTick()` deep-cloned the ENTIRE game state every tick:
- `state.map.map(row => row.map(cell => ({ ...cell })))` — 7000+ cells
- `state.influenceMap.map(row => row.map(cell => ({ ...cell })))` — 7000+ cells
- `new Map(state.pheromoneMap)` — full pheromone map copy
- Plus all ants, enemies, events, brood, deposits, colony mind, notifications, evolutions

**After**: Mutation-based approach — all systems mutate state directly:
- Removed all deep clone operations from `gameTick()`
- All 17+ game systems already mutate state in place, so no functional changes needed
- Return `{ ...state }` (shallow clone) so Zustand detects the change via `Object.is` check
- This eliminates ~14000+ object allocations per tick

### 2. Engine: Pheromone Map Mutation

**Before**: `new Map(state.pheromoneMap)` — O(n) copy every tick
**After**: Mutate existing Map in place. `decayPheromones()` and `diffusePheromones()` already modify the Map directly.

### 3. Engine: Reduce Fog of War Frequency

**Before**: `updateFogOfWar()` called every tick — O(ants * range²) per tick
**After**: Only called every 10 ticks via `if (state.currentTick % 10 === 0)` guard in `gameTick()`

### 4. Engine: Reduce Influence Map Frequency

**Before**: `updateInfluenceMap()` had internal `if (state.currentTick % 10 !== 0) return;` guard
**After**: Changed to every 15 ticks via guard in `gameTick()`, removed internal throttle

### 5. Engine: Reduce Cleanup Allocations

**Before**: Every tick filtered dead ants, dead enemies, depleted deposits, old notifications
**After**:
- Dead ant/enemy/deposit filtering: every 30 ticks (`state.currentTick % 30 === 0`)
- Old notification cleanup: every 60 ticks (`state.currentTick % 60 === 0`)
- Notification TTL increased from 400 to 1200 ticks to compensate

### 6. Engine: Optimize Action Functions

Applied same mutation pattern to user-action functions:
- `excavateArea()`: Removed map deep clone, mutate cells in place
- `buildChamber()`: Removed map deep clone and resources clone, mutate in place
- `markPheromone()`: Removed `new Map()` and resources clone, mutate in place
- `activateMindAbility()`: Removed colony mind deep clone, mutate ability directly

### 7. Renderer: Noise Value Caching

**Before**: Every visible cell computed noise via `Math.sin(x * 12.9898 + y * 78.233) * 43758.5453 % 1`
**After**: Pre-computed 256×256 noise lookup table (`noiseTable: Float32Array`), with `fastNoise(x, y, seed)` using bitwise AND for fast index. Replaced all 19 inline `Math.sin` noise patterns.

### 8. Renderer: Viewport Culling for Pheromones

**Before**: `renderPheromones()` iterated ALL pheromone entries
**After**: Added viewport bounds check — skip pheromones outside visible area

### 9. Renderer: Viewport-Culled Ambient Particle Scanning

**Before**: `spawnAmbientParticles()` scanned the ENTIRE 100×70 map grid 6 times per frame
**After**: Each scan only covers the visible viewport area, reducing iterations from 7000+ cells to ~200-400

### 10. Renderer: Reduce Particle Cap

**Before**: `MAX_PARTICLES = 600`
**After**: `MAX_PARTICLES = 400` — reduces particle rendering overhead by 33%

### 11. GameCanvas: Throttle Camera Store Updates

**Before**: Camera position written to Zustand store every frame when moving
**After**: Camera updates only written to store every 3 frames via `frameCounterRef`. Zoom updates still every frame.

### Technical Notes
- No changes to `types.ts`, `constants.ts`, or `store.ts`
- Shallow clone `{ ...state }` ensures Zustand's `Object.is` check detects the change
- `state.currentTick` used consistently
- Lint passes cleanly, dev server compiles without errors

Stage Summary:
- Eliminated #1 performance killer: deep clone of 14000+ objects per tick → zero deep clones
- Fog of war computation reduced 90% (every 10 ticks)
- Influence map computation reduced 93% (every 15 ticks)
- Cleanup allocations reduced 97% (every 30/60 ticks)
- Renderer noise: pre-computed lookup table replaces Math.sin per cell per frame
- Pheromone rendering viewport-culled
- Ambient particle scanning viewport-culled
- Particle cap reduced 600 → 400
- Camera store updates throttled to every 3 frames
