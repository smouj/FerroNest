# Task 3: Replace Unicode Symbols with Lucide Icons

## Agent: Icon Replacement Agent

## Work Log:

### HUD.tsx Changes
- Replaced all RESOURCE_ICONS from string map (`Record<string, string>`) to ReactNode map (`Record<string, ReactNode>`) with Lucide icon components:
  - food: `●` → `<Wheat className="w-3 h-3 text-amber-500" />`
  - protein: `◆` → `<Beef className="w-3 h-3 text-red-400" />`
  - sugar: `◇` → `<Gem className="w-3 h-3 text-pink-400" />`
  - fungus: `✦` → `<Clover className="w-3 h-3 text-emerald-400" />` (Mushroom not available in lucide-react)
  - water: `▽` → `<Droplets className="w-3 h-3 text-blue-400" />`
  - pheromones: `◎` → `<FlaskConical className="w-3 h-3 text-purple-400" />`
  - biomass: `⬡` → `<Leaf className="w-3 h-3 text-green-500" />`
  - compactEarth: `■` → `<Mountain className="w-3 h-3 text-amber-700" />`
  - nectar: `◉` → `<Flower2 className="w-3 h-3 text-yellow-400" />`
  - leafFragments: `♣` → `<Leaf className="w-3 h-3 text-lime-500" />`
- Replaced all CASTE_ICONS from string map to ReactNode map:
  - Queen: `▲` → `<Crown className="w-3 h-3 text-amber-400" />`
  - Worker: `⛏` → `<Hammer className="w-3 h-3 text-amber-300" />`
  - Scout: `◎` → `<Eye className="w-3 h-3 text-blue-300" />`
  - Soldier: `⚔` → `<Sword className="w-3 h-3 text-red-400" />`
  - Nurse: `♥` → `<Heart className="w-3 h-3 text-pink-300" />`
  - Builder: `▣` → `<Wrench className="w-3 h-3 text-orange-300" />`
  - Cultivator: `✦` → `<Sprout className="w-3 h-3 text-emerald-300" />`
- Time of day: `◉`/`○` → `<Sun>`/`<Moon>` icons with proper colors
- Pause indicator: `‖` → `<Pause>` icon
- Queen health: `▲` → `<Crown>` icon, `✗` → `<X>` icon
- Ant count: `⊕` → `<Users>` icon
- Brood: `◎` → `<Egg>` icon
- Enemies: `⚔` → `<Skull>` icon
- Event warning: `△` → `<AlertTriangle>` icon
- Resource display: removed wrapping `<span className="text-xs">` and render icon directly from map
- Caste tooltip: updated to use flex layout with ReactNode icons

### ToolBar.tsx Changes
- Changed TOOLS array `icon` field from `string` to `ReactNode`:
  - Dig: `⛏` → `<Hammer>`
  - Build: `◈` → `<Building2>`
  - Mark: `◈` → `<Pen>`
  - Focus: `!` → `<Target>`
  - Evac: `◄` → `<LogOut>`
  - Defend: `♦` → `<Shield>`
  - Expand: `↗` → `<Maximize2>`
  - Select: `⊕` → `<MousePointer2>`
- Pause/Play button: `‖`/`▶` → `<Pause>`/`<Play>` icons
- Chamber cost: `■`/`⬡` → `<Square>`/`<Hexagon>` icons
- Pheromone view: `◈` → `<Eye>` icon
- Minimap: `◫` → `<Map>` icon
- Mind ability active: `✦` → `<Sparkles>` icon
- Tool icon wrapper: added `flex items-center` for proper alignment

### page.tsx Changes
- Intro screen feature grid: replaced all unicode symbols with Lucide icons:
  - `⛏` → `<Hammer>` (Excavate tunnels)
  - `◈` → `<Building2>` (Build chambers)
  - `◈` → `<Pen>` (Mark pheromones)
  - `♦` → `<Shield>` (Defend the queen)
  - `◎` → `<Egg>` (Raise brood)
  - `⚔` → `<Sword>` (Fight enemies)
  - `✦` → `<Sprout>` (Grow fungus)
  - `♥` → `<Heart>` (Nurse larvae)
  - `≈` → `<Droplets>` (Control climate)
- Added `shrink-0` to all icons to prevent shrinking in flex layout
- Imported `ReactNode` type from 'react' for type annotations

### Verification
- Ran `bun run lint` - passes with no errors
- Checked dev server log - compiles successfully
- Ran regex scan for remaining unicode symbols - none found
- Ran regex scan for remaining emojis - none found

## Stage Summary:
- All unicode symbols (●◆◇✦▽◎⬡■◉♣▲⚔♥⛏◈▣‼◄♦↗⊕◫‖▶○✗) replaced with proper Lucide React icons
- Three files modified: HUD.tsx, ToolBar.tsx, page.tsx
- No game logic, rendering, or engine code changed
- All icons use consistent small sizing (w-3 h-3 for HUD/toolbar, w-3.5 h-3.5 for intro screen)
- Icons are color-coded using Tailwind classes matching their semantic meaning
- Lint passes cleanly, dev server compiles without errors
