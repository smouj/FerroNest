// ============================================================
// FerroNest - Canvas Renderer (Professional Edition)
// Fog of War, Day/Night Cycle, Minimap, Enhanced Particles
// Enhanced terrain textures, water animation, chamber visuals
// ============================================================

import {
  GameState, TerrainType, AntCaste, AntState, ChamberType,
  PheromoneType, EnemyType, BroodStage, RenderParticle,
} from './types';
import {
  MAP_WIDTH, MAP_HEIGHT, SURFACE_ROW, CELL_SIZE,
  CHAMBER_INFO, PHEROMONE_COLORS, ENEMY_STATS, FOG_SETTINGS,
} from './constants';

// --- Color Palettes ---
const ANT_COLORS: Record<AntCaste, { body: string; dark: string; light: string }> = {
  [AntCaste.Queen]: { body: '#D4A017', dark: '#8B6914', light: '#FFD700' },
  [AntCaste.Worker]: { body: '#7B4B2A', dark: '#5C3520', light: '#A0653D' },
  [AntCaste.Scout]: { body: '#8B5E3C', dark: '#6B4426', light: '#B07D56' },
  [AntCaste.Soldier]: { body: '#8B2500', dark: '#6B1C00', light: '#CD3700' },
  [AntCaste.Nurse]: { body: '#C9A96E', dark: '#A08050', light: '#E0C890' },
  [AntCaste.Builder]: { body: '#9B7B3C', dark: '#7B5B2C', light: '#BB9B5C' },
  [AntCaste.Cultivator]: { body: '#5B7B3C', dark: '#3B5B2C', light: '#7B9B5C' },
};

const RESOURCE_COLORS: Record<string, string> = {
  food: '#8B6914',
  protein: '#CD853F',
  sugar: '#FFD700',
  water: '#4A90B8',
  fungus: '#7B9E6B',
  nectar: '#FF8C00',
  leaf_fragments: '#228B22',
  compact_earth: '#8B7355',
  biomass: '#9370DB',
  pheromones: '#9B59B6',
};

// --- Fast Noise Cache ---
// Pre-computed noise table to avoid Math.sin per-cell per-frame
const NOISE_SIZE = 256;
const noiseTable = new Float32Array(NOISE_SIZE * NOISE_SIZE);
for (let i = 0; i < NOISE_SIZE * NOISE_SIZE; i++) {
  const n = Math.sin((i % NOISE_SIZE) * 12.9898 + Math.floor(i / NOISE_SIZE) * 78.233) * 43758.5453;
  noiseTable[i] = n - Math.floor(n);
}

/** Fast hash-based noise lookup — replaces inline Math.sin hash patterns */
function fastNoise(x: number, y: number, seed: number = 0): number {
  const ix = ((x + seed * 37) & 0xFF);
  const iy = ((y + seed * 13) & 0xFF);
  return noiseTable[iy * NOISE_SIZE + ix];
}

// --- Particle System ---
const particles: RenderParticle[] = [];
const MAX_PARTICLES = 400;

function addParticle(
  x: number, y: number, vx: number, vy: number,
  life: number, color: string, size: number = 1,
  type: RenderParticle['type'] = 'dust'
) {
  if (particles.length >= MAX_PARTICLES) return;
  particles.push({ x, y, vx, vy, life, maxLife: life, color, size, type });
}

function updateAndRenderParticles(ctx: CanvasRenderingContext2D) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;

    switch (p.type) {
      case 'dust':
        p.vy -= 0.005;
        p.vx += Math.sin(p.life * 0.03) * 0.003;
        break;
      case 'spore':
        p.vy -= 0.02;
        p.vx += Math.sin(p.life * 0.1) * 0.02;
        break;
      case 'spark':
        p.vy += 0.05;
        p.vx *= 0.97;
        break;
      case 'dig':
        p.vy += 0.03;
        p.vx *= 0.95;
        break;
      case 'combat':
        p.vy += 0.01;
        p.vx += (Math.random() - 0.5) * 0.1;
        break;
      case 'rain':
        p.vy = 2 + Math.random();
        p.vx = -0.3;
        break;
      case 'glow':
        p.vy -= 0.01;
        p.vx += Math.sin(p.life * 0.2) * 0.01;
        break;
      case 'pheromone':
        p.vy -= 0.008;
        p.vx += Math.sin(p.life * 0.05) * 0.01;
        break;
      case 'bubble':
        p.vy -= 0.015 + Math.random() * 0.005;
        p.vx += Math.sin(p.life * 0.15) * 0.02;
        break;
      case 'drip':
        p.vy += 0.06;
        p.vx *= 0.9;
        break;
    }

    p.life--;

    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha * (p.type === 'glow' ? 0.4 : p.type === 'pheromone' ? 0.3 : p.type === 'bubble' ? 0.35 : p.type === 'drip' ? 0.5 : 0.6);

    if (p.type === 'glow' || p.type === 'pheromone') {
      // Radial gradient for glow/pheromone particles
      const radius = p.size * (1 + (1 - alpha) * 0.5);
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
      grad.addColorStop(0, p.color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'bubble') {
      // Bubble: hollow circle with highlight
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.8 + (1 - alpha) * 0.4), 0, Math.PI * 2);
      ctx.stroke();
      // Small highlight
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(p.x - p.size * 0.2, p.y - p.size * 0.2, p.size * 0.25, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'drip') {
      // Drip: elongated dot falling down
      ctx.fillStyle = p.color;
      const s = p.size * alpha;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, s * 0.4, s, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = p.color;
      const s = p.size * alpha;
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
  }
  ctx.globalAlpha = 1;
}

// --- Main Render Function ---
export function renderGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  canvasWidth: number,
  canvasHeight: number
) {
  const { cameraX, cameraY, zoom, showPheromoneView } = state;

  ctx.save();
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Sky gradient based on time of day - rich color transitions
  const skyGrad = ctx.createLinearGradient(0, 0, 0, SURFACE_ROW * CELL_SIZE * zoom - cameraY * zoom);
  const skyTop = skyTopColor(state.timeOfDay);
  const skyBot = skyBotColor(state.timeOfDay);
  skyGrad.addColorStop(0, skyTop);
  skyGrad.addColorStop(1, skyBot);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvasWidth, Math.max(0, SURFACE_ROW * CELL_SIZE * zoom - cameraY * zoom));

  // Underground background with depth gradient
  const ugTop = Math.max(0, SURFACE_ROW * CELL_SIZE * zoom - cameraY * zoom);
  if (ugTop < canvasHeight) {
    const ugGrad = ctx.createLinearGradient(0, ugTop, 0, canvasHeight);
    ugGrad.addColorStop(0, '#0c0a06');
    ugGrad.addColorStop(0.3, '#080604');
    ugGrad.addColorStop(0.7, '#060408');
    ugGrad.addColorStop(1, '#040308');
    ctx.fillStyle = ugGrad;
    ctx.fillRect(0, ugTop, canvasWidth, canvasHeight - ugTop);
  }

  // Apply camera transform
  ctx.translate(-cameraX * zoom, -cameraY * zoom);
  ctx.scale(zoom, zoom);

  // Render terrain
  renderTerrain(ctx, state, canvasWidth, canvasHeight, cameraX, cameraY, zoom);

  // Render surface details (stars, moon, sun)
  renderSurface(ctx, state);

  // Render pheromones
  renderPheromones(ctx, state);

  // Render resource deposits
  renderResourceDeposits(ctx, state);

  // Render brood
  renderBrood(ctx, state);

  // Render ants
  renderAnts(ctx, state);

  // Render enemies
  renderEnemies(ctx, state);

  // Render water overlay
  renderWater(ctx, state);

  // Render underground light seepage
  renderUndergroundLight(ctx, state, canvasWidth, canvasHeight, cameraX, cameraY, zoom);

  // Render fog of war
  renderFogOfWar(ctx, state, canvasWidth, canvasHeight, cameraX, cameraY, zoom);

  // Render event effects
  renderEventEffects(ctx, state);

  // Render surface fog/mist
  renderSurfaceFog(ctx, state);

  // Render chamber labels
  renderChamberLabels(ctx, state);

  // Particles
  updateAndRenderParticles(ctx);

  // Spawn ambient particles
  spawnAmbientParticles(state);

  ctx.restore();
}

// --- Terrain Rendering ---
function renderTerrain(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cw: number, ch: number,
  camX: number, camY: number, zoom: number
) {
  const startCol = Math.max(0, Math.floor(camX / CELL_SIZE) - 1);
  const endCol = Math.min(MAP_WIDTH, Math.ceil((camX + cw / zoom) / CELL_SIZE) + 1);
  const startRow = Math.max(0, Math.floor(camY / CELL_SIZE) - 1);
  const endRow = Math.min(MAP_HEIGHT, Math.ceil((camY + ch / zoom) / CELL_SIZE) + 1);

  for (let y = startRow; y < endRow; y++) {
    for (let x = startCol; x < endCol; x++) {
      const cell = state.map[y]?.[x];
      if (!cell) continue;

      const px = x * CELL_SIZE;
      const py = y * CELL_SIZE;
      const terrain = cell.terrain;

      // Base color
      let color: string;

      switch (terrain) {
        case TerrainType.Sky: {
          const skyProgress = y / SURFACE_ROW;
          color = lerpColor(skyTopColor(state.timeOfDay), skyBotColor(state.timeOfDay), skyProgress);
          break;
        }
        case TerrainType.SurfaceGrass:
          color = lerpColor('#1e4a1a', '#3a6b30', cell.soilNutrients);
          break;
        case TerrainType.SurfaceDirt:
          color = lerpColor('#4a3020', '#6b4a30', cell.soilNutrients);
          break;
        case TerrainType.Dirt: {
          const depth = y - SURFACE_ROW;
          // Smooth 4-stage depth gradient with blue tint at depth
          if (depth < 10) {
            color = lerpColor('#4a3528', '#3e2723', depth / 10);
          } else if (depth < 25) {
            color = lerpColor('#3e2723', '#2c1b14', (depth - 10) / 15);
          } else if (depth < 45) {
            color = lerpColor('#2c1b14', '#1e1418', (depth - 25) / 20);
          } else {
            color = '#1e1418';
          }
          // Variation with noise
          const n = fastNoise(x, y);
          color = lerpColor(color, n > 0.5 ? '#4a3828' : '#241810', Math.abs(n - 0.5) * 0.3);
          break;
        }
        case TerrainType.HardDirt: {
          const depth = y - SURFACE_ROW;
          const deepTint = depth > 40 ? lerpColor('#2c1b14', '#1e1418', (depth - 40) / 30) : '#2c1b14';
          color = deepTint;
          const n2 = fastNoise(x, y, 2);
          color = lerpColor(color, '#342418', Math.abs(n2 - 0.5) * 0.2);
          break;
        }
        case TerrainType.Stone:
          color = lerpColor('#3a3a3a', '#5a5a5a', fastNoise(x, y, 3) * 0.2);
          break;
        case TerrainType.Tunnel: {
          // Subtle floor texture with faint dirt particles
          const tunnelNoise = fastNoise(x, y, 5);
          color = lerpColor('#1a1410', '#1e1814', Math.abs(tunnelNoise - 0.5) * 0.8);
          break;
        }
        case TerrainType.Chamber: {
          // Chamber floor tint based on chamber type - more distinct
          let chamberBase = '#1a1410';
          if (cell.chamberType === ChamberType.FungusChamber) chamberBase = '#141a12';
          else if (cell.chamberType === ChamberType.Barracks) chamberBase = '#1a1010';
          else if (cell.chamberType === ChamberType.FoodStorage) chamberBase = '#1a1610';
          else if (cell.chamberType === ChamberType.WasteChamber) chamberBase = '#1a1a12';
          else if (cell.chamberType === ChamberType.HumidityChamber) chamberBase = '#121618';
          else if (cell.chamberType === ChamberType.NurseryChamber) chamberBase = '#1a1220';
          else if (cell.chamberType === ChamberType.QueenChamber) chamberBase = '#1a1610';
          else if (cell.chamberType === ChamberType.GranaryChamber) chamberBase = '#1a1610';
          else if (cell.chamberType === ChamberType.BroodChamber) chamberBase = '#1a1220';
          const chNoise = fastNoise(x, y, 7);
          color = lerpColor(chamberBase, '#1e1814', Math.abs(chNoise - 0.5) * 0.6);
          break;
        }
        case TerrainType.Water:
          color = '#0d47a1';
          break;
        case TerrainType.Roots:
          color = '#3E2723';
          break;
        case TerrainType.Clay: {
          const clayNoise = fastNoise(x, y, 11);
          color = lerpColor('#8B5E3C', '#A0724E', clayNoise * 0.2);
          break;
        }
        case TerrainType.Sand: {
          const sandNoise = fastNoise(x, y, 13);
          color = lerpColor('#B8A87A', '#C8B88A', sandNoise * 0.15);
          break;
        }
        default:
          color = '#1a1410';
      }

      ctx.fillStyle = color;
      ctx.fillRect(px, py, CELL_SIZE + 0.5, CELL_SIZE + 0.5);

      // --- Depth-based blue tint overlay for underground ---
      if (y > SURFACE_ROW && terrain !== TerrainType.Sky && terrain !== TerrainType.SurfaceGrass && terrain !== TerrainType.SurfaceDirt) {
        const depthFromSurface = y - SURFACE_ROW;
        if (depthFromSurface > 20) {
          const blueTint = Math.min(0.08, (depthFromSurface - 20) / 400);
          ctx.fillStyle = `rgba(10, 15, 40, ${blueTint})`;
          ctx.fillRect(px, py, CELL_SIZE + 0.5, CELL_SIZE + 0.5);
        }
      }

      // Dirt texture noise with smoother transitions
      if (terrain === TerrainType.Dirt || terrain === TerrainType.HardDirt || terrain === TerrainType.SurfaceDirt) {
        const noise = fastNoise(x, y);
        if (noise > 0.5) {
          ctx.fillStyle = `rgba(255,220,180,${0.015 + noise * 0.015})`;
          ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
        }
        if (noise < 0.2) {
          ctx.fillStyle = 'rgba(0,0,0,0.04)';
          ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
        }
        // Pebbles
        if (noise > 0.8) {
          ctx.fillStyle = `rgba(100,80,60,0.15)`;
          ctx.beginPath();
          ctx.arc(px + CELL_SIZE / 2 + noise * 3, py + CELL_SIZE / 2, 1, 0, Math.PI * 2);
          ctx.fill();
        }
        // Soil layer transition lines - horizontal subtle lines at depth boundaries
        const depth = y - SURFACE_ROW;
        if (depth === 10 || depth === 25 || depth === 45) {
          ctx.fillStyle = 'rgba(0,0,0,0.06)';
          ctx.fillRect(px, py, CELL_SIZE, 2);
        }
      }

      // Clay grain patterns
      if (terrain === TerrainType.Clay) {
        const grainNoise = fastNoise(x, y, 17);
        if (grainNoise > 0.3) {
          // Fine horizontal grain lines
          ctx.fillStyle = `rgba(160, 114, 78, ${0.06 + Math.abs(grainNoise) * 0.04})`;
          ctx.fillRect(px, py + (grainNoise > 0.6 ? 4 : 8), CELL_SIZE, 0.5);
        }
        if (grainNoise < 0.2) {
          ctx.fillStyle = `rgba(80, 50, 30, 0.08)`;
          ctx.fillRect(px + 2, py + 2, 1, 1);
        }
      }

      // Sand grain patterns
      if (terrain === TerrainType.Sand) {
        const sandGrain = fastNoise(x, y, 19);
        if (sandGrain > 0.2) {
          // Scattered sand grains
          ctx.fillStyle = `rgba(200, 190, 150, ${0.08 + Math.abs(sandGrain) * 0.05})`;
          const gx = px + ((sandGrain * 11) % CELL_SIZE);
          const gy = py + ((sandGrain * 7) % CELL_SIZE);
          ctx.fillRect(gx, gy, 0.8, 0.8);
        }
        if (sandGrain < 0.15) {
          ctx.fillStyle = `rgba(140, 130, 100, 0.06)`;
          const gx2 = px + ((sandGrain * 9 + CELL_SIZE) % CELL_SIZE);
          const gy2 = py + ((sandGrain * 5 + CELL_SIZE) % CELL_SIZE);
          ctx.fillRect(gx2, gy2, 1, 0.6);
        }
      }

      // Stone: improved cracks and mineral veins
      if (terrain === TerrainType.Stone) {
        const crack = fastNoise(x, y, 23);
        if (crack > 0.6) {
          ctx.strokeStyle = 'rgba(30,30,30,0.35)';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(px + 2, py + 2);
          ctx.lineTo(px + CELL_SIZE - 2, py + CELL_SIZE - 2);
          ctx.stroke();
        }
        // Second crack direction
        const crack2 = fastNoise(x, y, 29);
        if (crack2 > 0.75) {
          ctx.strokeStyle = 'rgba(30,30,30,0.2)';
          ctx.lineWidth = 0.4;
          ctx.beginPath();
          ctx.moveTo(px + CELL_SIZE - 2, py + 2);
          ctx.lineTo(px + 2, py + CELL_SIZE - 2);
          ctx.stroke();
        }
        // Mineral vein highlights
        const mineral = fastNoise(x, y, 31);
        if (mineral > 0.85) {
          // Quartz vein (whitish)
          ctx.strokeStyle = 'rgba(200, 200, 210, 0.15)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(px + 1, py + CELL_SIZE * 0.3);
          ctx.lineTo(px + CELL_SIZE * 0.6, py + CELL_SIZE * 0.5);
          ctx.lineTo(px + CELL_SIZE - 1, py + CELL_SIZE * 0.7);
          ctx.stroke();
        } else if (mineral > 0.78 && mineral < 0.82) {
          // Iron oxide vein (reddish)
          ctx.strokeStyle = 'rgba(180, 80, 50, 0.12)';
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(px + CELL_SIZE * 0.2, py + 1);
          ctx.lineTo(px + CELL_SIZE * 0.5, py + CELL_SIZE * 0.4);
          ctx.lineTo(px + CELL_SIZE * 0.8, py + CELL_SIZE - 1);
          ctx.stroke();
        } else if (mineral < 0.1) {
          // Copper vein (greenish)
          ctx.strokeStyle = 'rgba(80, 160, 100, 0.1)';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(px + 2, py + CELL_SIZE / 2);
          ctx.lineTo(px + CELL_SIZE - 2, py + CELL_SIZE / 2 + mineral * 2);
          ctx.stroke();
        }
      }

      // Moss patches near surface
      if (terrain === TerrainType.Dirt || terrain === TerrainType.SurfaceDirt) {
        const depth = y - SURFACE_ROW;
        if (depth >= 0 && depth < 8) {
          const mossNoise = fastNoise(x, y, 37);
          if (mossNoise > 0.7) {
            ctx.fillStyle = `rgba(60, 100, 40, ${0.08 + (1 - depth / 8) * 0.08})`;
            ctx.beginPath();
            ctx.ellipse(px + CELL_SIZE / 2, py + CELL_SIZE / 2, CELL_SIZE * 0.3, CELL_SIZE * 0.2, mossNoise, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Fungi spots in deeper areas
      if (terrain === TerrainType.Dirt || terrain === TerrainType.HardDirt) {
        const depth = y - SURFACE_ROW;
        if (depth > 20) {
          const fungiNoise = fastNoise(x, y, 41);
          if (fungiNoise > 0.88) {
            ctx.fillStyle = `rgba(180, 170, 140, ${0.06 + (depth - 20) / 200})`;
            ctx.beginPath();
            ctx.arc(px + CELL_SIZE * 0.3, py + CELL_SIZE * 0.7, 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = `rgba(200, 190, 160, ${0.04 + (depth - 20) / 300})`;
            ctx.beginPath();
            ctx.arc(px + CELL_SIZE * 0.6, py + CELL_SIZE * 0.4, 1, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Tunnel/chamber floor texture (scattered dirt particles)
      if (terrain === TerrainType.Tunnel || terrain === TerrainType.Chamber) {
        const floorNoise = fastNoise(x, y, 17);
        if (floorNoise > 0.6) {
          ctx.fillStyle = `rgba(140,110,70,${0.04 + Math.abs(floorNoise) * 0.03})`;
          const dotX = px + (floorNoise * 8 % CELL_SIZE);
          const dotY = py + ((floorNoise * 13) % CELL_SIZE);
          ctx.fillRect(dotX, dotY, 1, 1);
        }
        if (floorNoise < 0.2) {
          ctx.fillStyle = `rgba(60,40,20,0.06)`;
          const dotX = px + ((floorNoise * 7 + CELL_SIZE) % CELL_SIZE);
          const dotY = py + ((floorNoise * 11 + CELL_SIZE) % CELL_SIZE);
          ctx.fillRect(dotX, dotY, 1.5, 1);
        }
      }

      // Tunnel/chamber wall effects (enhanced ambient occlusion + archway borders)
      if (terrain === TerrainType.Tunnel || terrain === TerrainType.Chamber) {
        renderWallEffects(ctx, state, cell, px, py);

        // Tunnel quality visual
        if (cell.tunnelQuality < 0.5 && terrain === TerrainType.Tunnel) {
          ctx.fillStyle = `rgba(80,60,40,${(1 - cell.tunnelQuality) * 0.12})`;
          ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
        }

        // Chamber type glow - more distinct and visible
        if (terrain === TerrainType.Chamber && cell.chamberType) {
          const info = CHAMBER_INFO[cell.chamberType];
          ctx.fillStyle = info.color + '10';
          ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

          if (cell.chamberType === ChamberType.QueenChamber) {
            const glowPulse = 0.06 + Math.sin(state.currentTick * 0.03) * 0.03;
            ctx.fillStyle = `rgba(212, 160, 23, ${glowPulse})`;
            ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
          }

          if (cell.chamberType === ChamberType.FungusChamber) {
            const glowPulse = 0.07 + Math.sin(state.currentTick * 0.02 + x * 0.1) * 0.04;
            ctx.fillStyle = `rgba(80, 140, 60, ${glowPulse})`;
            ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
            // Scattered fungus dots
            const fDot = fastNoise(x, y, 43);
            if (fDot > 0.6) {
              ctx.fillStyle = `rgba(100, 160, 80, ${0.08 + fDot * 0.04})`;
              ctx.beginPath();
              ctx.arc(px + (fDot * 8 % CELL_SIZE), py + ((fDot * 13) % CELL_SIZE), 0.8, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          if (cell.chamberType === ChamberType.Barracks) {
            const glowPulse = 0.05 + Math.sin(state.currentTick * 0.04) * 0.03;
            ctx.fillStyle = `rgba(160, 40, 20, ${glowPulse})`;
            ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
          }

          if (cell.chamberType === ChamberType.NurseryChamber || cell.chamberType === ChamberType.BroodChamber) {
            const glowPulse = 0.05 + Math.sin(state.currentTick * 0.025 + x * 0.15) * 0.03;
            ctx.fillStyle = `rgba(220, 160, 180, ${glowPulse})`;
            ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
          }

          if (cell.chamberType === ChamberType.FoodStorage || cell.chamberType === ChamberType.GranaryChamber) {
            const glowPulse = 0.04 + Math.sin(state.currentTick * 0.035) * 0.02;
            ctx.fillStyle = `rgba(200, 170, 80, ${glowPulse})`;
            ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
          }
        }

        // Chamber/tunnel carved border at wall edges (archway effect)
        renderChamberBorder(ctx, state, cell, px, py);
      }

      // Excavation progress cracks
      if (cell.excavatable && cell.hardness > 0 && cell.hardness < 1) {
        const progress = 1 - cell.hardness;
        ctx.strokeStyle = `rgba(0,0,0,${progress * 0.5})`;
        ctx.lineWidth = 0.5;
        const cx = px + CELL_SIZE / 2;
        const cy = py + CELL_SIZE / 2;
        ctx.beginPath();
        ctx.moveTo(cx - 2, cy - 1);
        ctx.lineTo(cx + 1, cy + 2);
        ctx.stroke();
        if (progress > 0.3) {
          ctx.beginPath();
          ctx.moveTo(cx + 1, cy - 2);
          ctx.lineTo(cx - 1, cy + 1);
          ctx.stroke();
        }
        if (progress > 0.6) {
          ctx.beginPath();
          ctx.moveTo(cx - 3, cy + 1);
          ctx.lineTo(cx + 2, cy - 2);
          ctx.stroke();
        }
      }

      // Contamination overlay
      if (cell.contamination > 0.1) {
        ctx.fillStyle = `rgba(100, 150, 50, ${cell.contamination * 0.2})`;
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
      }

      // Temperature overlay (very subtle)
      if (cell.temperature < 0.2) {
        ctx.fillStyle = 'rgba(100, 150, 255, 0.03)';
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
      } else if (cell.temperature > 0.85) {
        ctx.fillStyle = 'rgba(255, 100, 50, 0.03)';
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
      }
    }
  }

  // Surface line with grass
  renderSurfaceLine(ctx, state, startCol, endCol);
}

// --- Chamber border (carved archway effect) ---
function renderChamberBorder(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cell: Cell,
  px: number, py: number
) {
  const x = cell.x;
  const y = cell.y;
  const above = state.map[y - 1]?.[x];
  const below = state.map[y + 1]?.[x];
  const left = state.map[y]?.[x - 1];
  const right = state.map[y]?.[x + 1];

  const isWall = (t: TerrainType | undefined) =>
    t && t !== TerrainType.Tunnel && t !== TerrainType.Chamber &&
    t !== TerrainType.Sky && t !== TerrainType.SurfaceGrass && t !== TerrainType.Sand;

  const isFloor = (t: TerrainType | undefined) =>
    t === TerrainType.Tunnel || t === TerrainType.Chamber;

  // Carved archway border at wall edges
  const borderW = 1.5;
  const archColor = 'rgba(100, 75, 50, 0.18)';
  const highlightColor = 'rgba(160, 130, 90, 0.08)';

  if (isWall(above?.terrain)) {
    // Top arch: draw a slight curved highlight at the transition
    ctx.fillStyle = archColor;
    ctx.fillRect(px, py, CELL_SIZE, borderW);
    ctx.fillStyle = highlightColor;
    ctx.fillRect(px, py + borderW, CELL_SIZE, 0.5);
  }
  if (isWall(below?.terrain)) {
    ctx.fillStyle = archColor;
    ctx.fillRect(px, py + CELL_SIZE - borderW, CELL_SIZE, borderW);
  }
  if (isWall(left?.terrain)) {
    ctx.fillStyle = archColor;
    ctx.fillRect(px, py, borderW, CELL_SIZE);
    ctx.fillStyle = highlightColor;
    ctx.fillRect(px + borderW, py, 0.5, CELL_SIZE);
  }
  if (isWall(right?.terrain)) {
    ctx.fillStyle = archColor;
    ctx.fillRect(px + CELL_SIZE - borderW, py, borderW, CELL_SIZE);
  }

  // Corner archway stones
  if (isWall(above?.terrain) && isWall(left?.terrain)) {
    ctx.fillStyle = 'rgba(80, 60, 40, 0.12)';
    ctx.fillRect(px, py, 3, 3);
  }
  if (isWall(above?.terrain) && isWall(right?.terrain)) {
    ctx.fillStyle = 'rgba(80, 60, 40, 0.10)';
    ctx.fillRect(px + CELL_SIZE - 3, py, 3, 3);
  }
  if (isWall(below?.terrain) && isWall(left?.terrain)) {
    ctx.fillStyle = 'rgba(80, 60, 40, 0.08)';
    ctx.fillRect(px, py + CELL_SIZE - 3, 3, 3);
  }
  if (isWall(below?.terrain) && isWall(right?.terrain)) {
    ctx.fillStyle = 'rgba(80, 60, 40, 0.08)';
    ctx.fillRect(px + CELL_SIZE - 3, py + CELL_SIZE - 3, 3, 3);
  }

  // Tunnel depth shading: tunnels far from queen chamber are rougher/unfinished
  if (cell.terrain === TerrainType.Tunnel) {
    // Find if we're adjacent to a queen chamber
    let nearQueen = false;
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const nearby = state.map[y + dy]?.[x + dx];
        if (nearby?.chamberType === ChamberType.QueenChamber) {
          nearQueen = true;
          break;
        }
      }
      if (nearQueen) break;
    }
    if (!nearQueen) {
      // Rougher texture further from queen
      const roughNoise = fastNoise(x, y, 47);
      if (roughNoise > 0.5) {
        ctx.fillStyle = `rgba(80, 60, 40, ${0.03 + Math.abs(roughNoise) * 0.03})`;
        ctx.fillRect(px + (roughNoise * 5 % CELL_SIZE), py + ((roughNoise * 7) % CELL_SIZE), 1.5, 1);
      }
    }
  }
}

function renderWallEffects(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cell: Cell,
  px: number, py: number
) {
  const x = cell.x;
  const y = cell.y;
  const above = state.map[y - 1]?.[x];
  const below = state.map[y + 1]?.[x];
  const left = state.map[y]?.[x - 1];
  const right = state.map[y]?.[x + 1];

  const isWall = (t: TerrainType | undefined) =>
    t && t !== TerrainType.Tunnel && t !== TerrainType.Chamber &&
    t !== TerrainType.Sky && t !== TerrainType.SurfaceGrass && t !== TerrainType.Sand;

  // Wall shadows and highlights (enhanced ambient occlusion)
  if (isWall(above?.terrain)) {
    const grad = ctx.createLinearGradient(px, py, px, py + 4);
    grad.addColorStop(0, 'rgba(0,0,0,0.38)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0.15)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(px, py, CELL_SIZE, 4);
  }
  if (isWall(below?.terrain)) {
    ctx.fillStyle = 'rgba(80,60,40,0.12)';
    ctx.fillRect(px, py + CELL_SIZE - 2, CELL_SIZE, 2);
  }
  if (isWall(left?.terrain)) {
    const grad = ctx.createLinearGradient(px, py, px + 3, py);
    grad.addColorStop(0, 'rgba(0,0,0,0.32)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0.12)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(px, py, 3, CELL_SIZE);
  }
  if (isWall(right?.terrain)) {
    ctx.fillStyle = 'rgba(80,60,40,0.1)';
    ctx.fillRect(px + CELL_SIZE - 2, py, 2, CELL_SIZE);
  }
  // Corner darkening for extra AO
  if (isWall(above?.terrain) && isWall(left?.terrain)) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(px, py, 3, 3);
  }
  if (isWall(above?.terrain) && isWall(right?.terrain)) {
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(px + CELL_SIZE - 3, py, 3, 3);
  }
}

function renderSurfaceLine(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  startCol: number,
  endCol: number
) {
  const surfaceY = 3 * CELL_SIZE;

  // Ground line
  ctx.fillStyle = '#1e4a1a';
  ctx.fillRect(startCol * CELL_SIZE, surfaceY - 2, (endCol - startCol) * CELL_SIZE, 4);
  ctx.fillStyle = '#3a6b30';
  ctx.fillRect(startCol * CELL_SIZE, surfaceY - 1, (endCol - startCol) * CELL_SIZE, 2);

  // Animated grass blades (more varied: thick clusters, dead/yellow grass)
  for (let x = startCol; x < endCol; x++) {
    const hash = Math.sin(x * 7.77 + 3.33);
    if (hash > 0.15) {
      const gx = x * CELL_SIZE + (hash * 4 + 4);
      const gy = surfaceY;
      const sway = Math.sin(state.currentTick * 0.02 + x * 0.5) * 1.5;

      // Determine grass color: mostly green, some yellow/dead
      const grassHash = Math.sin(x * 3.33 + 1.11);
      const isYellowGrass = grassHash > 0.85;
      ctx.strokeStyle = isYellowGrass ? '#8B7D3C' : '#3a6b30';
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.quadraticCurveTo(gx + sway, gy - 5, gx + sway + Math.sin(x) * 2, gy - 8);
      ctx.stroke();

      // Thicker grass clusters for some
      if (hash > 0.5) {
        ctx.beginPath();
        ctx.moveTo(gx + 2, gy);
        ctx.quadraticCurveTo(gx + 2 - sway * 0.5, gy - 4, gx + 2 - sway * 0.3, gy - 6);
        ctx.stroke();
      }
      if (hash > 0.75) {
        // Extra thick cluster: third blade
        ctx.strokeStyle = isYellowGrass ? '#9B8D4C' : '#4a7b40';
        ctx.beginPath();
        ctx.moveTo(gx - 1, gy);
        ctx.quadraticCurveTo(gx - 1 + sway * 0.3, gy - 3, gx - 1 + sway * 0.2, gy - 7);
        ctx.stroke();
      }
    }
  }

  // Small rocks/pebbles on surface
  for (let x = startCol; x < endCol; x += 3) {
    const rockHash = Math.sin(x * 19.43 + 5.17);
    if (rockHash > 0.82) {
      const rx = x * CELL_SIZE + (rockHash * 6 + 3);
      const ry = surfaceY - 1;
      ctx.fillStyle = `rgba(120,100,80,${0.3 + rockHash * 0.2})`;
      ctx.beginPath();
      ctx.ellipse(rx, ry, 1.5 + rockHash, 1, 0, 0, Math.PI * 2);
      ctx.fill();
      // Rock highlight
      ctx.fillStyle = 'rgba(200,180,150,0.15)';
      ctx.beginPath();
      ctx.ellipse(rx - 0.5, ry - 0.3, 0.8, 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Surface flowers/plants - multi-petal rendering
  for (let x = startCol; x < endCol; x += 4) {
    const hash = Math.sin(x * 13.37 + 7.77);
    if (hash > 0.75) {
      const fx = x * CELL_SIZE + CELL_SIZE / 2;
      const fy = surfaceY - 3;
      // Stem
      ctx.strokeStyle = '#3a6b30';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(fx, surfaceY);
      ctx.lineTo(fx, fy + 1);
      ctx.stroke();
      // Multi-petal flower
      const petalCount = hash > 0.9 ? 5 : 4;
      const flowerColor = hash > 0.9 ? '#FFD700' : hash > 0.82 ? '#FF6347' : '#FF69B4';
      ctx.fillStyle = flowerColor;
      for (let p = 0; p < petalCount; p++) {
        const angle = (p / petalCount) * Math.PI * 2;
        const petalX = fx + Math.cos(angle) * 2;
        const petalY = fy + Math.sin(angle) * 2;
        ctx.beginPath();
        ctx.ellipse(petalX, petalY, 1.2, 0.7, angle, 0, Math.PI * 2);
        ctx.fill();
      }
      // Flower center
      ctx.fillStyle = hash > 0.85 ? '#FFF8DC' : '#FFE4B5';
      ctx.beginPath();
      ctx.arc(fx, fy, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Underground roots - more organic with thickness variation and extensive branching
  for (let x = startCol; x < endCol; x += 4) {
    const rootY = (SURFACE_ROW + 2) * CELL_SIZE;
    const hash = Math.sin(x * 3.14 + 1.57);
    if (hash > 0.05) {
      const baseX = x * CELL_SIZE;
      const thickness = 0.8 + hash * 1.2;

      // Main root with taper
      const endX = baseX + hash * 22;
      const endY = rootY + 45 + hash * 10;
      ctx.strokeStyle = `rgba(62, 39, 35, ${0.2 + hash * 0.2})`;
      ctx.lineWidth = thickness;
      ctx.beginPath();
      ctx.moveTo(baseX, rootY);
      ctx.bezierCurveTo(
        baseX + 10, rootY + 15 + hash * 10,
        baseX - 5, rootY + 30 + hash * 5,
        endX, endY
      );
      ctx.stroke();

      // Branch root 1 - left side
      if (hash > 0.25) {
        ctx.lineWidth = thickness * 0.6;
        ctx.strokeStyle = `rgba(62, 39, 35, ${0.15 + hash * 0.12})`;
        const branchStart = rootY + 18 + hash * 6;
        const branchEndX = baseX - 12 + hash * 3;
        const branchEndY = branchStart + 22 + hash * 4;
        ctx.beginPath();
        ctx.moveTo(baseX + 5, branchStart);
        ctx.quadraticCurveTo(baseX - 6, branchStart + 10, branchEndX, branchEndY);
        ctx.stroke();

        // Sub-branch from branch 1
        if (hash > 0.55) {
          ctx.lineWidth = thickness * 0.35;
          ctx.strokeStyle = `rgba(62, 39, 35, ${0.1 + hash * 0.08})`;
          ctx.beginPath();
          ctx.moveTo(baseX - 3, branchStart + 12);
          ctx.quadraticCurveTo(baseX - 10, branchStart + 18, baseX - 14, branchStart + 25);
          ctx.stroke();
        }
      }

      // Branch root 2 - right side
      if (hash > 0.4) {
        ctx.lineWidth = thickness * 0.55;
        ctx.strokeStyle = `rgba(62, 39, 35, ${0.14 + hash * 0.1})`;
        const branch2Start = rootY + 22 + hash * 4;
        ctx.beginPath();
        ctx.moveTo(baseX + 12, branch2Start);
        ctx.quadraticCurveTo(baseX + 20, branch2Start + 8, baseX + 25, branch2Start + 18);
        ctx.stroke();

        // Sub-branch from branch 2
        if (hash > 0.7) {
          ctx.lineWidth = thickness * 0.3;
          ctx.strokeStyle = `rgba(62, 39, 35, ${0.08 + hash * 0.06})`;
          ctx.beginPath();
          ctx.moveTo(baseX + 20, branch2Start + 10);
          ctx.quadraticCurveTo(baseX + 25, branch2Start + 14, baseX + 30, branch2Start + 22);
          ctx.stroke();
        }
      }

      // Tiny rootlets from main root
      if (hash > 0.6) {
        ctx.lineWidth = thickness * 0.25;
        ctx.strokeStyle = `rgba(62, 39, 35, ${0.08 + hash * 0.05})`;
        const rootletY = rootY + 30 + hash * 5;
        ctx.beginPath();
        ctx.moveTo(baseX + 8, rootletY);
        ctx.lineTo(baseX + 4, rootletY + 8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(baseX + 14, rootletY + 5);
        ctx.lineTo(baseX + 18, rootletY + 12);
        ctx.stroke();
      }
    }
  }
}

// --- Surface Details (Stars, Moon, Sun) ---
function renderSurface(ctx: CanvasRenderingContext2D, state: GameState) {
  const ambient = state.ambientLight;

  // Stars (only visible at night)
  if (ambient < 0.6) {
    const starAlpha = (0.6 - ambient) / 0.6;
    for (let i = 0; i < 60; i++) {
      const sx = (Math.sin(i * 45.7 + 1.2) * 0.5 + 0.5) * MAP_WIDTH * CELL_SIZE;
      const sy = (Math.sin(i * 23.1 + 0.5) * 0.5 + 0.3) * (SURFACE_ROW - 2) * CELL_SIZE;
      const brightness = (0.15 + Math.sin(state.currentTick * 0.015 + i * 1.7) * 0.1) * starAlpha;
      ctx.fillStyle = `rgba(255, 255, 220, ${brightness})`;
      const size = 0.5 + (Math.sin(i * 12.3) > 0.7 ? 1 : 0);
      ctx.fillRect(sx, sy, size, size);
    }

    // Moon
    const moonX = MAP_WIDTH * CELL_SIZE * 0.8;
    const moonY = CELL_SIZE * 1.5;
    ctx.fillStyle = `rgba(255, 255, 230, ${0.1 * starAlpha})`;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 255, 230, ${0.2 * starAlpha})`;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 255, 240, ${0.5 * starAlpha})`;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sun during day
  if (ambient > 0.7) {
    const sunAlpha = (ambient - 0.7) / 0.3;
    const sunX = MAP_WIDTH * CELL_SIZE * 0.5;
    const sunY = CELL_SIZE * 2;
    ctx.fillStyle = `rgba(255, 240, 200, ${0.15 * sunAlpha})`;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 240, 200, ${0.3 * sunAlpha})`;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 12, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- Surface Fog/Mist (early morning) ---
function renderSurfaceFog(ctx: CanvasRenderingContext2D, state: GameState) {
  const tod = state.timeOfDay;
  // Fog visible around dawn (0.2-0.35)
  let fogAlpha = 0;
  if (tod > 0.2 && tod < 0.35) {
    fogAlpha = 1 - Math.abs(tod - 0.275) / 0.075;
    fogAlpha = Math.max(0, Math.min(1, fogAlpha)) * 0.12;
  }

  if (fogAlpha > 0.01) {
    const surfaceY = SURFACE_ROW * CELL_SIZE;
    // Layered fog
    for (let layer = 0; layer < 3; layer++) {
      const fogY = surfaceY - 10 - layer * 8;
      const fogH = 16 + layer * 4;
      const drift = Math.sin(state.currentTick * 0.008 + layer * 2) * 15;
      const grad = ctx.createLinearGradient(0, fogY, 0, fogY + fogH);
      const a = fogAlpha * (1 - layer * 0.3);
      grad.addColorStop(0, `rgba(200, 210, 220, 0)`);
      grad.addColorStop(0.3, `rgba(200, 210, 220, ${a * 0.6})`);
      grad.addColorStop(0.6, `rgba(200, 210, 220, ${a})`);
      grad.addColorStop(1, `rgba(200, 210, 220, 0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(drift - 20, fogY, MAP_WIDTH * CELL_SIZE + 40, fogH);
    }
  }
}

// --- Underground Light Seepage ---
function renderUndergroundLight(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cw: number, ch: number,
  camX: number, camY: number, zoom: number
) {
  const ambient = state.ambientLight;
  if (ambient < 0.1) return; // No seepage at deep night

  const startCol = Math.max(0, Math.floor(camX / CELL_SIZE) - 1);
  const endCol = Math.min(MAP_WIDTH, Math.ceil((camX + cw / zoom) / CELL_SIZE) + 1);

  // Find entrance tunnels (tunnel cells close to surface) and add warm/cool light
  for (let y = SURFACE_ROW; y < Math.min(MAP_HEIGHT, SURFACE_ROW + 8); y++) {
    for (let x = startCol; x < endCol; x++) {
      const cell = state.map[y]?.[x];
      if (!cell) continue;
      if (cell.terrain !== TerrainType.Tunnel && cell.terrain !== TerrainType.Chamber) continue;

      const depthFromSurface = y - SURFACE_ROW;
      const seepageAlpha = (1 - depthFromSurface / 8) * ambient * 0.08;
      if (seepageAlpha > 0.005) {
        // Warm light during day, cooler at dusk/dawn
        const tod = state.timeOfDay;
        if (tod > 0.15 && tod < 0.85) {
          // Daytime: warm golden light
          ctx.fillStyle = `rgba(255, 220, 150, ${seepageAlpha})`;
        } else {
          // Night/dusk: cool blue light
          ctx.fillStyle = `rgba(100, 140, 200, ${seepageAlpha * 0.5})`;
        }
        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }
  }
}

// --- Pheromones ---
function renderPheromones(ctx: CanvasRenderingContext2D, state: GameState) {
  if (state.pheromoneMap.size === 0) return;

  // Viewport culling: only render pheromones within visible area
  const startCol = Math.max(0, Math.floor(state.cameraX / CELL_SIZE) - 2);
  const endCol = Math.min(MAP_WIDTH, Math.ceil((state.cameraX + 2000 / state.zoom) / CELL_SIZE) + 2);
  const startRow = Math.max(0, Math.floor(state.cameraY / CELL_SIZE) - 2);
  const endRow = Math.min(MAP_HEIGHT, Math.ceil((state.cameraY + 1200 / state.zoom) / CELL_SIZE) + 2);

  state.pheromoneMap.forEach((p) => {
    // Viewport culling
    if (p.x < startCol || p.x > endCol || p.y < startRow || p.y > endRow) return;

    const px = p.x * CELL_SIZE;
    const py = p.y * CELL_SIZE;
    const color = PHEROMONE_COLORS[p.type];
    if (!color) return;

    const baseAlpha = state.showPheromoneView ? 120 : 35;
    const strengthAlpha = Math.min(baseAlpha, Math.floor(p.strength * baseAlpha));
    const hexStrength = strengthAlpha.toString(16).padStart(2, '0');

    ctx.fillStyle = color + hexStrength;
    ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

    // Pheromone particles
    if (p.strength > 0.3 && Math.random() < 0.01) {
      addParticle(
        px + Math.random() * CELL_SIZE,
        py + Math.random() * CELL_SIZE,
        (Math.random() - 0.5) * 0.3,
        -Math.random() * 0.15,
        30 + Math.random() * 20,
        color + '80',
        1.5,
        'pheromone'
      );
    }
  });

  // Pheromone view: darken non-pheromone areas (only visible portion)
  if (state.showPheromoneView) {
    const startCol = Math.max(0, Math.floor(state.cameraX / CELL_SIZE) - 1);
    const endCol = Math.min(MAP_WIDTH, Math.ceil((state.cameraX + 2000 / state.zoom) / CELL_SIZE) + 1);
    const startRow = Math.max(0, Math.floor(state.cameraY / CELL_SIZE) - 1);
    const endRow = Math.min(MAP_HEIGHT, Math.ceil((state.cameraY + 1200 / state.zoom) / CELL_SIZE) + 1);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    for (let y = startRow; y < endRow; y++) {
      for (let x = startCol; x < endCol; x++) {
        if (!state.pheromoneMap.has(`${x},${y}`)) {
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
      }
    }
  }
}

// --- Resource Deposits ---
function renderResourceDeposits(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const deposit of state.surfaceDeposits) {
    if (deposit.amount <= 0) continue;

    const px = deposit.x * CELL_SIZE;
    const py = deposit.y * CELL_SIZE;
    const color = RESOURCE_COLORS[deposit.type] || '#8B6914';
    const fillRatio = deposit.amount / deposit.maxAmount;
    const size = 3 + fillRatio * 5;
    const cx = px + CELL_SIZE / 2;
    const cy = py + CELL_SIZE / 2;

    // Pulsing glow
    const glowPulse = 1 + Math.sin(state.currentTick * 0.03 + deposit.x) * 0.2;
    ctx.fillStyle = color + '18';
    ctx.beginPath();
    ctx.arc(cx, cy, (size + 5) * glowPulse, 0, Math.PI * 2);
    ctx.fill();

    // Main deposit shape varies by type
    ctx.fillStyle = color;
    if (deposit.type === 'sugar') {
      // Diamond shape for sugar
      ctx.beginPath();
      ctx.moveTo(cx, cy - size);
      ctx.lineTo(cx + size * 0.7, cy);
      ctx.lineTo(cx, cy + size);
      ctx.lineTo(cx - size * 0.7, cy);
      ctx.closePath();
      ctx.fill();
    } else if (deposit.type === 'water') {
      // Hexagon shape for water
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
        const hx = cx + Math.cos(angle) * size * 0.8;
        const hy = cy + Math.sin(angle) * size * 0.8;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fill();
    } else if (deposit.type === 'compact_earth') {
      // Square shape for earth
      const half = size * 0.7;
      ctx.fillRect(cx - half, cy - half, half * 2, half * 2);
    } else {
      // Circle for food, protein, nectar, leaf_fragments, etc.
      ctx.beginPath();
      ctx.arc(cx, cy, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.arc(cx - size * 0.2, cy - size * 0.2, size * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.max(6, size * 0.5)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const labels: Record<string, string> = { food: 'F', protein: 'P', sugar: 'S', water: 'W', nectar: 'N', leaf_fragments: 'L' };
    ctx.fillText(labels[deposit.type] || '?', cx, cy);

    // Amount indicator fill bar below deposit
    const barW = 10;
    const barH = 1.5;
    const barX = cx - barW / 2;
    const barY = cy + size + 3;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX - 0.5, barY - 0.5, barW + 1, barH + 1);
    ctx.fillStyle = fillRatio > 0.5 ? color : fillRatio > 0.25 ? '#FF9800' : '#F44336';
    ctx.fillRect(barX, barY, barW * fillRatio, barH);
  }
}

// --- Brood ---
function renderBrood(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const brood of state.brood) {
    if (brood.health <= 0) continue;

    const px = brood.x * CELL_SIZE;
    const py = brood.y * CELL_SIZE;

    let color: string;
    let size: number;

    switch (brood.stage) {
      case BroodStage.Egg:
        color = '#F5F5DC';
        size = 2;
        break;
      case BroodStage.Larva:
        color = brood.needsFood ? '#FFB6C1' : '#FAEBD7';
        size = 3;
        break;
      case BroodStage.Pupa:
        color = '#D2B48C';
        size = 3.5;
        break;
    }

    // Glow
    ctx.fillStyle = color + '25';
    ctx.beginPath();
    ctx.arc(px + CELL_SIZE / 2, py + CELL_SIZE / 2, size + 2, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px + CELL_SIZE / 2, py + CELL_SIZE / 2, size, 0, Math.PI * 2);
    ctx.fill();

    // Progress ring
    if (brood.progress > 0) {
      ctx.strokeStyle = color + 'AA';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(px + CELL_SIZE / 2, py + CELL_SIZE / 2, size + 1.5,
        -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * brood.progress);
      ctx.stroke();
    }
  }
}

// --- Ants (Detailed) ---
function renderAnts(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const ant of state.ants) {
    if (ant.state === AntState.Dead) continue;

    const px = ant.x * CELL_SIZE;
    const py = ant.y * CELL_SIZE;
    const colors = ANT_COLORS[ant.caste];
    const isQueen = ant.caste === AntCaste.Queen;
    const isSoldier = ant.caste === AntCaste.Soldier;
    const isScout = ant.caste === AntCaste.Scout;

    const bodyLen = isQueen ? 9 : isSoldier ? 7 : isScout ? 5 : 4.5;
    const angle = ant.facingAngle;

    ctx.save();
    ctx.translate(px + CELL_SIZE / 2, py + CELL_SIZE / 2);
    ctx.rotate(angle);

    // Abdomen
    ctx.fillStyle = colors.dark;
    ctx.beginPath();
    ctx.ellipse(-bodyLen * 0.3, 0, bodyLen * 0.4, bodyLen * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.body;
    ctx.beginPath();
    ctx.ellipse(-bodyLen * 0.3, 0, bodyLen * 0.35, bodyLen * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Thorax
    ctx.fillStyle = colors.body;
    ctx.beginPath();
    ctx.ellipse(0, 0, bodyLen * 0.25, bodyLen * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = colors.body;
    ctx.beginPath();
    ctx.ellipse(bodyLen * 0.3, 0, bodyLen * 0.22, bodyLen * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs with animation
    ctx.strokeStyle = colors.dark;
    ctx.lineWidth = 0.6;
    for (let i = -1; i <= 1; i++) {
      const legX = i * bodyLen * 0.15;
      const isMoving = ant.state === AntState.Moving || ant.state === AntState.Patrolling || ant.state === AntState.Exploring;
      const legAnim = isMoving ? Math.sin(ant.animationFrame * 3 + i * 2) * 2 : Math.sin(ant.animationFrame + i) * 0.5;

      // Top legs
      ctx.beginPath();
      ctx.moveTo(legX, bodyLen * 0.15);
      ctx.quadraticCurveTo(legX + legAnim * 0.5, bodyLen * 0.3, legX + legAnim, bodyLen * 0.5);
      ctx.stroke();
      // Bottom legs
      ctx.beginPath();
      ctx.moveTo(legX, -bodyLen * 0.15);
      ctx.quadraticCurveTo(legX - legAnim * 0.5, -bodyLen * 0.3, legX - legAnim, -bodyLen * 0.5);
      ctx.stroke();
    }

    // Mandibles
    if (isSoldier || isQueen) {
      ctx.strokeStyle = colors.dark;
      ctx.lineWidth = isSoldier ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(bodyLen * 0.45, -bodyLen * 0.08);
      ctx.lineTo(bodyLen * 0.6, -bodyLen * 0.22);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bodyLen * 0.45, bodyLen * 0.08);
      ctx.lineTo(bodyLen * 0.6, bodyLen * 0.22);
      ctx.stroke();
    }

    // Antennae
    ctx.strokeStyle = colors.light + 'BB';
    ctx.lineWidth = 0.5;
    const antAnim = Math.sin(ant.animationFrame * 0.5) * 1.5;
    ctx.beginPath();
    ctx.moveTo(bodyLen * 0.4, -bodyLen * 0.1);
    ctx.quadraticCurveTo(bodyLen * 0.55, -bodyLen * 0.25 + antAnim, bodyLen * 0.65, -bodyLen * 0.35 + antAnim);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bodyLen * 0.4, bodyLen * 0.1);
    ctx.quadraticCurveTo(bodyLen * 0.55, bodyLen * 0.25 - antAnim, bodyLen * 0.65, bodyLen * 0.35 - antAnim);
    ctx.stroke();

    // Eyes
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(bodyLen * 0.35, -bodyLen * 0.08, 0.6, 0, Math.PI * 2);
    ctx.arc(bodyLen * 0.35, bodyLen * 0.08, 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Carrying indicator
    if (ant.carrying) {
      const carryColor = RESOURCE_COLORS[ant.carrying] || '#FFD700';
      ctx.fillStyle = carryColor;
      ctx.beginPath();
      ctx.arc(bodyLen * 0.55, -bodyLen * 0.3, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // Carry glow
      ctx.fillStyle = carryColor + '30';
      ctx.beginPath();
      ctx.arc(bodyLen * 0.55, -bodyLen * 0.3, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Queen crown glow (not rotated)
    if (isQueen) {
      const glowPulse = 0.08 + Math.sin(state.currentTick * 0.04) * 0.04;
      ctx.fillStyle = `rgba(212, 160, 23, ${glowPulse})`;
      ctx.beginPath();
      ctx.arc(px + CELL_SIZE / 2, py + CELL_SIZE / 2, 14, 0, Math.PI * 2);
      ctx.fill();

      // Draw crown symbol (not emoji)
      const crownX = px + CELL_SIZE / 2;
      const crownY = py - 4;
      ctx.fillStyle = '#FFD700';
      ctx.strokeStyle = '#B8860B';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(crownX - 4, crownY + 2);
      ctx.lineTo(crownX - 4, crownY - 1);
      ctx.lineTo(crownX - 2, crownY);
      ctx.lineTo(crownX, crownY - 3);
      ctx.lineTo(crownX + 2, crownY);
      ctx.lineTo(crownX + 4, crownY - 1);
      ctx.lineTo(crownX + 4, crownY + 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Fighting effect
    if (ant.state === AntState.Fighting) {
      ctx.fillStyle = `rgba(255, 50, 50, ${0.12 + Math.sin(state.currentTick * 0.3) * 0.08})`;
      ctx.beginPath();
      ctx.arc(px + CELL_SIZE / 2, py + CELL_SIZE / 2, 7, 0, Math.PI * 2);
      ctx.fill();

      // Combat sparks
      if (Math.random() < 0.1) {
        addParticle(
          px + CELL_SIZE / 2 + (Math.random() - 0.5) * 8,
          py + CELL_SIZE / 2 + (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 2,
          -Math.random() * 2,
          15,
          '#FF4444',
          1.5,
          'combat'
        );
      }
    }

    // Excavating effect
    if (ant.state === AntState.Excavating) {
      if (Math.random() < 0.15) {
        addParticle(
          px + CELL_SIZE / 2 + (Math.random() - 0.5) * 6,
          py + CELL_SIZE / 2,
          (Math.random() - 0.5) * 1.5,
          -Math.random() * 1,
          20,
          '#8B6914',
          1.5,
          'dig'
        );
      }
    }

    // Health bar for damaged ants
    if (ant.health < ant.maxHealth * 0.8) {
      const barWidth = 10;
      const barHeight = 1.5;
      const barX = px + CELL_SIZE / 2 - barWidth / 2;
      const barY = py - 3;

      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(barX - 0.5, barY - 0.5, barWidth + 1, barHeight + 1);
      const healthRatio = ant.health / ant.maxHealth;
      ctx.fillStyle = healthRatio > 0.5 ? '#4CAF50' : healthRatio > 0.25 ? '#FF9800' : '#F44336';
      ctx.fillRect(barX, barY, barWidth * healthRatio, barHeight);
    }

    // Fatigue indicator (subtle)
    if (ant.fatigue > 0.6) {
      ctx.fillStyle = `rgba(100, 100, 200, ${ant.fatigue * 0.15})`;
      ctx.beginPath();
      ctx.arc(px + CELL_SIZE / 2, py + CELL_SIZE / 2, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// --- Enemies (Detailed) ---
function renderEnemies(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const enemy of state.enemies) {
    if (enemy.health <= 0) continue;

    const stats = ENEMY_STATS[enemy.type];
    const px = enemy.x * CELL_SIZE;
    const py = enemy.y * CELL_SIZE;
    const size = stats.size * CELL_SIZE * 0.5;

    // Menacing glow
    ctx.fillStyle = 'rgba(255, 0, 0, 0.06)';
    ctx.beginPath();
    ctx.arc(px + CELL_SIZE / 2, py + CELL_SIZE / 2, size + 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(px + CELL_SIZE / 2, py + CELL_SIZE / 2);
    ctx.rotate(enemy.facingAngle);

    if (enemy.type === EnemyType.Spider) {
      ctx.fillStyle = stats.color;
      // Abdomen
      ctx.beginPath();
      ctx.ellipse(-size * 0.3, 0, size * 0.45, size * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      // Cephalothorax
      ctx.beginPath();
      ctx.ellipse(size * 0.2, 0, size * 0.25, size * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      // Legs
      ctx.strokeStyle = stats.color;
      ctx.lineWidth = 0.8;
      for (let i = 0; i < 4; i++) {
        const side = i < 2 ? 1 : -1;
        const legPhase = Math.sin(enemy.animationFrame * 0.8 + i * 1.5) * 0.2;
        for (const s of [1, -1]) {
          ctx.beginPath();
          ctx.moveTo(side * size * 0.15, s * size * 0.15);
          ctx.quadraticCurveTo(
            side * size * 0.5, s * size * (0.4 + legPhase),
            side * size * 0.7, s * size * (0.5 + legPhase)
          );
          ctx.stroke();
        }
      }
      // Eyes
      ctx.fillStyle = '#FF0000';
      ctx.beginPath();
      ctx.arc(size * 0.3, -2, 1.2, 0, Math.PI * 2);
      ctx.arc(size * 0.3, 2, 1.2, 0, Math.PI * 2);
      ctx.fill();
      // Fangs
      ctx.strokeStyle = '#8B0000';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(size * 0.4, -1);
      ctx.lineTo(size * 0.55, -3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(size * 0.4, 1);
      ctx.lineTo(size * 0.55, 3);
      ctx.stroke();
    } else if (enemy.type === EnemyType.Centipede) {
      ctx.fillStyle = stats.color;
      for (let i = 0; i < 8; i++) {
        const sx = -i * 3.5;
        const sy = Math.sin(enemy.animationFrame * 0.4 + i * 0.8) * 2;
        ctx.beginPath();
        ctx.arc(sx, sy, size * 0.2, 0, Math.PI * 2);
        ctx.fill();
        // Legs
        ctx.strokeStyle = stats.color;
        ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.moveTo(sx, sy - size * 0.15);
        ctx.lineTo(sx + 1, sy - size * 0.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sx, sy + size * 0.15);
        ctx.lineTo(sx + 1, sy + size * 0.4);
        ctx.stroke();
      }
    } else if (enemy.type === EnemyType.Wasp) {
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.5, size * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      // Stripes
      ctx.fillStyle = '#111';
      for (let i = -2; i <= 2; i++) {
        ctx.fillRect(i * 4 - 0.5, -size * 0.3, 1, size * 0.6);
      }
      // Wings
      ctx.fillStyle = 'rgba(200,220,255,0.35)';
      const wingAnim = Math.sin(enemy.animationFrame * 1.5) * 3;
      ctx.beginPath();
      ctx.ellipse(0, -size * 0.35 + wingAnim * 0.2, size * 0.45, size * 0.12, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, size * 0.35 - wingAnim * 0.2, size * 0.45, size * 0.12, 0.3, 0, Math.PI * 2);
      ctx.fill();
      // Stinger
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.moveTo(-size * 0.5, 0);
      ctx.lineTo(-size * 0.7, -1);
      ctx.lineTo(-size * 0.7, 1);
      ctx.fill();
    } else if (enemy.type === EnemyType.Antlion) {
      // Funnel-shaped body
      ctx.fillStyle = stats.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.6, size * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      // Jaws
      ctx.strokeStyle = '#5C4033';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(size * 0.5, -size * 0.15);
      ctx.lineTo(size * 0.75, -size * 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(size * 0.5, size * 0.15);
      ctx.lineTo(size * 0.75, size * 0.3);
      ctx.stroke();
    } else if (enemy.type === EnemyType.Mite) {
      ctx.fillStyle = stats.color;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
      ctx.fill();
      // Tiny legs
      ctx.strokeStyle = stats.color;
      ctx.lineWidth = 0.3;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * size * 0.2, Math.sin(a) * size * 0.2);
        ctx.lineTo(Math.cos(a) * size * 0.5, Math.sin(a) * size * 0.5);
        ctx.stroke();
      }
    } else {
      // Generic (beetle, rival ant, termite)
      ctx.fillStyle = stats.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.5, size * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      // Head
      ctx.beginPath();
      ctx.arc(size * 0.4, 0, size * 0.2, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = '#FF0000';
      ctx.beginPath();
      ctx.arc(size * 0.5, -1, 0.8, 0, Math.PI * 2);
      ctx.arc(size * 0.5, 1, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Health bar
    const barWidth = size * 2.5;
    const barHeight = 2;
    const barX = px + CELL_SIZE / 2 - barWidth / 2;
    const barY = py - 5;

    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(barX - 0.5, barY - 0.5, barWidth + 1, barHeight + 1);
    const healthPct = enemy.health / enemy.maxHealth;
    ctx.fillStyle = healthPct > 0.5 ? '#FF9800' : '#F44336';
    ctx.fillRect(barX, barY, barWidth * healthPct, barHeight);
  }
}

// --- Fog of War ---
function renderFogOfWar(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cw: number, ch: number,
  camX: number, camY: number, zoom: number
) {
  const startCol = Math.max(0, Math.floor(camX / CELL_SIZE) - 1);
  const endCol = Math.min(MAP_WIDTH, Math.ceil((camX + cw / zoom) / CELL_SIZE) + 1);
  const startRow = Math.max(0, Math.floor(camY / CELL_SIZE) - 1);
  const endRow = Math.min(MAP_HEIGHT, Math.ceil((camY + ch / zoom) / CELL_SIZE) + 1);

  for (let y = startRow; y < endRow; y++) {
    for (let x = startCol; x < endCol; x++) {
      const cell = state.map[y]?.[x];
      if (!cell) continue;

      if (!cell.explored) {
        // Completely dark
        ctx.fillStyle = 'rgba(0, 0, 0, 0.92)';
        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      } else if (cell.lightLevel < 0.8) {
        // Dim based on light level
        const darkness = 1 - cell.lightLevel;
        ctx.fillStyle = `rgba(0, 0, 0, ${darkness * 0.5})`;
        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }
  }
}

// --- Water Overlay (Animated) ---
function renderWater(ctx: CanvasRenderingContext2D, state: GameState) {
  const startCol = Math.max(0, Math.floor(state.cameraX / CELL_SIZE) - 1);
  const endCol = Math.min(MAP_WIDTH, Math.ceil((state.cameraX + 2000 / state.zoom) / CELL_SIZE) + 1);
  const startRow = Math.max(0, Math.floor(state.cameraY / CELL_SIZE) - 1);
  const endRow = Math.min(MAP_HEIGHT, Math.ceil((state.cameraY + 1200 / state.zoom) / CELL_SIZE) + 1);

  const tick = state.currentTick;

  for (let y = startRow; y < endRow; y++) {
    for (let x = startCol; x < endCol; x++) {
      const cell = state.map[y]?.[x];
      if (!cell) continue;

      const isWaterCell = cell.terrain === TerrainType.Water;
      const hasWaterLevel = cell.waterLevel > 0;

      if (!isWaterCell && !hasWaterLevel) continue;

      const px = x * CELL_SIZE;
      const py = y * CELL_SIZE;
      const waterAlpha = isWaterCell ? 0.5 : cell.waterLevel * 0.4;

      // Animated water surface with sin waves
      if (isWaterCell || cell.waterLevel > 0.3) {
        // Base water color
        ctx.fillStyle = `rgba(13, 71, 161, ${waterAlpha})`;
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

        // Animated wave pattern
        const wave1 = Math.sin(tick * 0.06 + x * 0.8 + y * 0.3) * 0.5 + 0.5;
        const wave2 = Math.sin(tick * 0.04 + x * 0.3 - y * 0.6) * 0.5 + 0.5;
        const waveCombined = (wave1 + wave2) * 0.5;

        // Wave highlights
        ctx.fillStyle = `rgba(60, 140, 220, ${waveCombined * waterAlpha * 0.3})`;
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

        // Bright wave crest lines
        if (waveCombined > 0.7) {
          const crestY = py + (1 - waveCombined) * CELL_SIZE;
          ctx.strokeStyle = `rgba(150, 210, 255, ${0.15 * waterAlpha})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(px, crestY);
          ctx.lineTo(px + CELL_SIZE, crestY + Math.sin(tick * 0.1 + x) * 1);
          ctx.stroke();
        }

        // Faint light reflections
        const reflectionPhase = Math.sin(tick * 0.03 + x * 1.2 + y * 0.7);
        if (reflectionPhase > 0.8) {
          ctx.fillStyle = `rgba(200, 230, 255, ${0.08 * waterAlpha})`;
          ctx.beginPath();
          ctx.ellipse(
            px + CELL_SIZE * 0.3 + Math.sin(tick * 0.02 + x) * 2,
            py + CELL_SIZE * 0.4,
            2, 0.8,
            tick * 0.01, 0, Math.PI * 2
          );
          ctx.fill();
        }
      } else if (hasWaterLevel) {
        ctx.fillStyle = `rgba(21, 101, 192, ${cell.waterLevel * 0.3})`;
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
      }

      // Water seepage at edges - dripping effect
      if (isWaterCell || cell.waterLevel > 0.3) {
        // Check if adjacent cells are non-water and underground
        const above = state.map[y - 1]?.[x];
        const below = state.map[y + 1]?.[x];
        const left = state.map[y]?.[x - 1];
        const right = state.map[y]?.[x + 1];

        // Seepage on non-water adjacent cells below
        if (below && below.terrain !== TerrainType.Water && below.waterLevel <= 0 &&
            below.terrain !== TerrainType.Sky && y > SURFACE_ROW) {
          const seepAlpha = 0.06 + Math.sin(tick * 0.05 + x * 2) * 0.03;
          ctx.fillStyle = `rgba(30, 80, 160, ${seepAlpha})`;
          ctx.fillRect(px + 2, py + CELL_SIZE - 1, CELL_SIZE - 4, 2);
          // Drip drops
          if (Math.sin(tick * 0.04 + x * 3.7) > 0.9) {
            ctx.fillStyle = `rgba(80, 150, 220, 0.15)`;
            ctx.beginPath();
            ctx.ellipse(px + CELL_SIZE * 0.5, py + CELL_SIZE + 1, 0.6, 1.2, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Side seepage
        if (left && left.terrain !== TerrainType.Water && left.waterLevel <= 0 &&
            left.terrain !== TerrainType.Sky && y > SURFACE_ROW) {
          const sideSeep = 0.04 + Math.sin(tick * 0.04 + y * 2.5) * 0.02;
          ctx.fillStyle = `rgba(30, 80, 160, ${sideSeep})`;
          ctx.fillRect(px, py + 2, 2, CELL_SIZE - 4);
        }
        if (right && right.terrain !== TerrainType.Water && right.waterLevel <= 0 &&
            right.terrain !== TerrainType.Sky && y > SURFACE_ROW) {
          const sideSeep2 = 0.04 + Math.sin(tick * 0.04 + y * 1.8) * 0.02;
          ctx.fillStyle = `rgba(30, 80, 160, ${sideSeep2})`;
          ctx.fillRect(px + CELL_SIZE - 2, py + 2, 2, CELL_SIZE - 4);
        }
      }
    }
  }
}

// --- Event Effects ---
function renderEventEffects(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const event of state.events) {
    switch (event.type) {
      case 'rain': {
        ctx.strokeStyle = 'rgba(100, 180, 255, 0.2)';
        ctx.lineWidth = 0.8;
        for (let i = 0; i < 100; i++) {
          const rx = ((Math.sin(i * 17.3) * 0.5 + 0.5) * MAP_WIDTH + Math.sin(state.currentTick * 0.01 + i) * 5) * CELL_SIZE;
          const ry = ((state.currentTick * 4 + i * 47) % (SURFACE_ROW * CELL_SIZE + 30));
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 1, ry + 6);
          ctx.stroke();
        }
        break;
      }
      case 'pesticide': {
        ctx.fillStyle = 'rgba(255, 20, 147, 0.06)';
        ctx.fillRect(0, 3 * CELL_SIZE, MAP_WIDTH * CELL_SIZE, 5 * CELL_SIZE);
        for (let i = 0; i < 30; i++) {
          const dx = (Math.sin(i * 31.1 + state.currentTick * 0.05) * 0.5 + 0.5) * MAP_WIDTH * CELL_SIZE;
          const dy = (3 + Math.sin(i * 17.3 + state.currentTick * 0.03) * 2) * CELL_SIZE;
          ctx.fillStyle = 'rgba(255, 20, 147, 0.12)';
          ctx.beginPath();
          ctx.arc(dx, dy, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'cold_snap': {
        ctx.fillStyle = 'rgba(100, 150, 255, 0.03)';
        ctx.fillRect(0, 0, MAP_WIDTH * CELL_SIZE, MAP_HEIGHT * CELL_SIZE);
        // Frost particles
        for (let i = 0; i < 10; i++) {
          const fx = (Math.sin(i * 41.7 + state.currentTick * 0.02) * 0.5 + 0.5) * MAP_WIDTH * CELL_SIZE;
          const fy = (Math.sin(i * 23.1 + state.currentTick * 0.01) * 0.5 + 0.5) * MAP_HEIGHT * CELL_SIZE;
          ctx.fillStyle = 'rgba(200, 220, 255, 0.15)';
          ctx.beginPath();
          ctx.arc(fx, fy, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'heat_wave': {
        ctx.fillStyle = 'rgba(255, 69, 0, 0.02)';
        ctx.fillRect(0, 0, MAP_WIDTH * CELL_SIZE, MAP_HEIGHT * CELL_SIZE);
        break;
      }
      case 'drought': {
        ctx.fillStyle = 'rgba(210, 105, 30, 0.015)';
        ctx.fillRect(0, 0, MAP_WIDTH * CELL_SIZE, MAP_HEIGHT * CELL_SIZE);
        break;
      }
      case 'earthquake': {
        // Screen shake effect via small offset lines
        const shake = Math.sin(state.currentTick * 2) * 2;
        ctx.strokeStyle = 'rgba(150, 150, 150, 0.05)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
          const y = (Math.random() * MAP_HEIGHT) * CELL_SIZE;
          ctx.beginPath();
          ctx.moveTo(0, y + shake);
          ctx.lineTo(MAP_WIDTH * CELL_SIZE, y + shake);
          ctx.stroke();
        }
        break;
      }
      case 'flood': {
        ctx.fillStyle = 'rgba(21, 101, 192, 0.04)';
        ctx.fillRect(0, SURFACE_ROW * CELL_SIZE, MAP_WIDTH * CELL_SIZE, 15 * CELL_SIZE);
        break;
      }
    }
  }
}

// --- Chamber Labels ---
function renderChamberLabels(ctx: CanvasRenderingContext2D, state: GameState) {
  const labeledChambers = new Set<string>();

  for (const row of state.map) {
    for (const cell of row) {
      if (!cell.chamberType || cell.terrain !== TerrainType.Chamber) continue;
      if (!cell.explored) continue;

      const key = cell.chamberType;
      if (labeledChambers.has(key)) continue;

      let sumX = 0, sumY = 0, count = 0;
      for (const r of state.map) {
        for (const c of r) {
          if (c.chamberType === key && c.terrain === TerrainType.Chamber && c.explored) {
            sumX += c.x;
            sumY += c.y;
            count++;
          }
        }
      }

      if (count > 0) {
        const cx = (sumX / count) * CELL_SIZE;
        const cy = (sumY / count) * CELL_SIZE;
        const info = CHAMBER_INFO[key];

        // Background pill
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        const textWidth = info.name.length * 3.5 + 8;
        ctx.roundRect(cx - textWidth / 2, cy - 8, textWidth, 12, 3);
        ctx.fill();

        ctx.fillStyle = info.color + 'CC';
        ctx.font = 'bold 6px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${info.icon} ${info.name}`, cx, cy - 2);

        labeledChambers.add(key);
      }
    }
  }
}

// --- Ambient Particles (Optimized — only scan visible area) ---
function spawnAmbientParticles(state: GameState) {
  // Compute visible area bounds for particle scanning
  const vStartCol = Math.max(0, Math.floor(state.cameraX / CELL_SIZE));
  const vEndCol = Math.min(MAP_WIDTH, Math.ceil((state.cameraX + 2000 / state.zoom) / CELL_SIZE));
  const vStartRow = Math.max(0, Math.floor(state.cameraY / CELL_SIZE));
  const vEndRow = Math.min(MAP_HEIGHT, Math.ceil((state.cameraY + 1200 / state.zoom) / CELL_SIZE));

  // Ambient dust in tunnels — only scan visible area
  if (Math.random() < 0.12) {
    const tunnels: { x: number; y: number }[] = [];
    for (let y = vStartRow; y < vEndRow; y += 3) {
      for (let x = vStartCol; x < vEndCol; x += 3) {
        const cell = state.map[y]?.[x];
        if (cell && (cell.terrain === TerrainType.Tunnel || cell.terrain === TerrainType.Chamber) && cell.explored) {
          tunnels.push({ x: cell.x, y: cell.y });
        }
      }
    }
    if (tunnels.length > 0) {
      const t = tunnels[Math.floor(Math.random() * tunnels.length)];
      addParticle(
        t.x * CELL_SIZE + Math.random() * CELL_SIZE,
        t.y * CELL_SIZE + Math.random() * CELL_SIZE,
        (Math.random() - 0.5) * 0.15,
        -Math.random() * 0.1 - 0.02,
        50 + Math.random() * 40,
        'rgba(180, 160, 120, 0.3)',
        0.8 + Math.random() * 0.4,
        'dust'
      );
    }
  }

  // Fungus spore particles — only scan visible area
  if (Math.random() < 0.04) {
    for (let y = vStartRow; y < vEndRow; y += 4) {
      for (let x = vStartCol; x < vEndCol; x += 4) {
        const cell = state.map[y]?.[x];
        if (cell?.chamberType === ChamberType.FungusChamber) {
          addParticle(
            cell.x * CELL_SIZE + Math.random() * CELL_SIZE,
            cell.y * CELL_SIZE + Math.random() * CELL_SIZE,
            (Math.random() - 0.5) * 0.4,
            -Math.random() * 0.2 - 0.05,
            60 + Math.random() * 40,
            'rgba(80, 180, 60, 0.6)',
            1.5 + Math.random(),
            'spore'
          );
        }
      }
    }
  }

  // Queen chamber warmth particles — only scan visible area
  if (Math.random() < 0.03) {
    for (let y = vStartRow; y < vEndRow; y += 4) {
      for (let x = vStartCol; x < vEndCol; x += 4) {
        const cell = state.map[y]?.[x];
        if (cell?.chamberType === ChamberType.QueenChamber) {
          addParticle(
            cell.x * CELL_SIZE + Math.random() * CELL_SIZE,
            cell.y * CELL_SIZE + Math.random() * CELL_SIZE,
            (Math.random() - 0.5) * 0.15,
            -Math.random() * 0.08 - 0.02,
            50 + Math.random() * 30,
            'rgba(255, 180, 60, 0.5)',
            1.2 + Math.random() * 0.8,
            'glow'
          );
        }
      }
    }
  }

  // Water drip particles near water cells — only scan visible area
  if (Math.random() < 0.06) {
    for (let y = Math.max(SURFACE_ROW, vStartRow); y < vEndRow; y += 3) {
      for (let x = vStartCol; x < vEndCol; x += 3) {
        const cell = state.map[y]?.[x];
        if (cell && (cell.terrain === TerrainType.Water || cell.waterLevel > 0.4)) {
          const below = state.map[y + 1]?.[x];
          if (below && (below.terrain === TerrainType.Tunnel || below.terrain === TerrainType.Chamber)) {
            if (Math.random() < 0.3) {
              addParticle(
                x * CELL_SIZE + Math.random() * CELL_SIZE,
                (y + 1) * CELL_SIZE + 2,
                0,
                0.1,
                20 + Math.random() * 15,
                'rgba(80, 150, 220, 0.6)',
                1,
                'drip'
              );
            }
          }
        }
      }
    }
  }

  // Water area bubbles — only scan visible area
  if (Math.random() < 0.04) {
    for (let y = vStartRow; y < vEndRow; y += 4) {
      for (let x = vStartCol; x < vEndCol; x += 4) {
        const cell = state.map[y]?.[x];
        if (cell && (cell.terrain === TerrainType.Water || cell.waterLevel > 0.4)) {
          addParticle(
            cell.x * CELL_SIZE + Math.random() * CELL_SIZE,
            cell.y * CELL_SIZE + Math.random() * CELL_SIZE,
            (Math.random() - 0.5) * 0.15,
            -Math.random() * 0.08 - 0.02,
            60 + Math.random() * 40,
            'rgba(100, 180, 255, 0.5)',
            1.5,
            'bubble'
          );
        }
      }
    }
  }

  // Nursery warmth particles — only scan visible area
  if (Math.random() < 0.02) {
    for (let y = vStartRow; y < vEndRow; y += 5) {
      for (let x = vStartCol; x < vEndCol; x += 5) {
        const cell = state.map[y]?.[x];
        if (cell?.chamberType === ChamberType.NurseryChamber || cell?.chamberType === ChamberType.BroodChamber) {
          addParticle(
            cell.x * CELL_SIZE + Math.random() * CELL_SIZE,
            cell.y * CELL_SIZE + Math.random() * CELL_SIZE,
            (Math.random() - 0.5) * 0.1,
            -Math.random() * 0.06,
            40 + Math.random() * 30,
            'rgba(255, 180, 200, 0.4)',
            1,
            'glow'
          );
        }
      }
    }
  }
}

// --- Minimap ---
export function renderMinimap(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  x: number, y: number,
  width: number, height: number
) {
  const scaleX = width / MAP_WIDTH;
  const scaleY = height / MAP_HEIGHT;

  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(x, y, width, height);

  // Terrain with clearer distinct colors
  for (let my = 0; my < MAP_HEIGHT; my += 2) {
    for (let mx = 0; mx < MAP_WIDTH; mx += 2) {
      const cell = state.map[my]?.[mx];
      if (!cell || !cell.explored) continue;

      let color: string;
      switch (cell.terrain) {
        case TerrainType.Sky: color = '#0d1a2e'; break;
        case TerrainType.SurfaceGrass: color = '#3d7a32'; break;
        case TerrainType.SurfaceDirt: color = '#7a5a3d'; break;
        case TerrainType.Tunnel: color = '#3a2e22'; break;
        case TerrainType.Chamber:
          color = cell.chamberType ? CHAMBER_INFO[cell.chamberType].color + 'B0' : '#3a2e22';
          break;
        case TerrainType.Water: color = '#2980D0'; break;
        case TerrainType.Stone: color = '#5a5a5a'; break;
        case TerrainType.Clay: color = '#B0704A'; break;
        case TerrainType.Sand: color = '#C8B878'; break;
        case TerrainType.Roots: color = '#5A3A28'; break;
        default: color = '#4a3020'; break;
      }

      ctx.fillStyle = color;
      ctx.fillRect(
        x + mx * scaleX,
        y + my * scaleY,
        scaleX * 2 + 0.5,
        scaleY * 2 + 0.5
      );
    }
  }

  // Chamber highlights as brighter colored dots
  const chamberCenters = new Map<string, { sx: number; sy: number; count: number; color: string }>();
  for (let my = 0; my < MAP_HEIGHT; my += 2) {
    for (let mx = 0; mx < MAP_WIDTH; mx += 2) {
      const cell = state.map[my]?.[mx];
      if (!cell || !cell.explored || cell.terrain !== TerrainType.Chamber || !cell.chamberType) continue;
      const key = cell.chamberType;
      const existing = chamberCenters.get(key);
      if (existing) {
        existing.sx += mx;
        existing.sy += my;
        existing.count++;
      } else {
        chamberCenters.set(key, { sx: mx, sy: my, count: 1, color: CHAMBER_INFO[cell.chamberType].color });
      }
    }
  }
  chamberCenters.forEach((ch) => {
    const avgX = ch.sx / ch.count;
    const avgY = ch.sy / ch.count;
    ctx.fillStyle = ch.color;
    ctx.beginPath();
    ctx.arc(x + avgX * scaleX, y + avgY * scaleY, 3, 0, Math.PI * 2);
    ctx.fill();
    // Brighter glow around chamber dot
    ctx.fillStyle = ch.color + '40';
    ctx.beginPath();
    ctx.arc(x + avgX * scaleX, y + avgY * scaleY, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Ants as bright dots
  for (const ant of state.ants) {
    if (ant.state === AntState.Dead) continue;
    const colors = ANT_COLORS[ant.caste];
    ctx.fillStyle = colors.light;
    ctx.fillRect(
      x + ant.x * scaleX - 0.5,
      y + ant.y * scaleY - 0.5,
      ant.caste === AntCaste.Queen ? 3 : 1.5,
      ant.caste === AntCaste.Queen ? 3 : 1.5
    );
  }

  // Enemies as red dots
  for (const enemy of state.enemies) {
    ctx.fillStyle = '#FF4444';
    ctx.fillRect(
      x + enemy.x * scaleX - 0.5,
      y + enemy.y * scaleY - 0.5,
      2, 2
    );
  }

  // Camera viewport rectangle
  ctx.strokeStyle = 'rgba(255, 200, 100, 0.5)';
  ctx.lineWidth = 0.5;
  const viewX = x + (state.cameraX / CELL_SIZE) * scaleX;
  const viewY = y + (state.cameraY / CELL_SIZE) * scaleY;
  const viewW = (800 / state.zoom / CELL_SIZE) * scaleX;
  const viewH = (600 / state.zoom / CELL_SIZE) * scaleY;
  ctx.strokeRect(viewX, viewY, viewW, viewH);

  // Border and "MAP" label
  ctx.strokeStyle = 'rgba(160, 130, 70, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - 0.5, y - 0.5, width + 1, height + 1);
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x, y - 11, 28, 11);
  ctx.fillStyle = 'rgba(160, 130, 70, 0.8)';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText('MAP', x + 3, y - 1);
}

// --- Utility ---
function lerpColor(a: string, b: string, t: number): string {
  // Handle rgb() format
  const parseColor = (c: string): [number, number, number] => {
    if (c.startsWith('rgb')) {
      const match = c.match(/(\d+)/g);
      if (match) return [parseInt(match[0]), parseInt(match[1]), parseInt(match[2])];
    }
    const h = c.replace('#', '');
    if (h.length === 3) {
      return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)];
    }
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };

  const [ar, ag, ab] = parseColor(a);
  const [br, bg, bb] = parseColor(b);

  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);

  return `rgb(${rr},${rg},${rb})`;
}

// Sky color based on timeOfDay (0=midnight, 0.25=dawn, 0.5=noon, 0.75=dusk, 1=midnight)
function skyTopColor(timeOfDay: number): string {
  // Define key colors for different times
  // Night: dark blue-black
  // Dawn: orange-pink
  // Noon: bright blue
  // Dusk: orange-red
  let r: number, g: number, b: number;

  if (timeOfDay < 0.15 || timeOfDay > 0.9) {
    // Deep night
    r = 5; g = 5; b = 15;
  } else if (timeOfDay < 0.25) {
    // Night to dawn transition
    const t = (timeOfDay - 0.15) / 0.1;
    r = Math.floor(5 + t * 60);
    g = Math.floor(5 + t * 25);
    b = Math.floor(15 + t * 30);
  } else if (timeOfDay < 0.35) {
    // Dawn - orange/pink sky
    const t = (timeOfDay - 0.25) / 0.1;
    r = Math.floor(65 + t * 55); // 65 -> 120
    g = Math.floor(30 + t * 70); // 30 -> 100
    b = Math.floor(45 + t * 80); // 45 -> 125
  } else if (timeOfDay < 0.45) {
    // Dawn to noon transition
    const t = (timeOfDay - 0.35) / 0.1;
    r = Math.floor(120 - t * 80); // 120 -> 40
    g = Math.floor(100 + t * 50); // 100 -> 150
    b = Math.floor(125 + t * 80); // 125 -> 205
  } else if (timeOfDay < 0.55) {
    // Noon - bright blue sky
    r = 40; g = 150; b = 205;
  } else if (timeOfDay < 0.65) {
    // Noon to dusk transition
    const t = (timeOfDay - 0.55) / 0.1;
    r = Math.floor(40 + t * 90); // 40 -> 130
    g = Math.floor(150 - t * 50); // 150 -> 100
    b = Math.floor(205 - t * 80); // 205 -> 125
  } else if (timeOfDay < 0.75) {
    // Dusk - orange/red sky
    const t = (timeOfDay - 0.65) / 0.1;
    r = Math.floor(130 + t * 20); // 130 -> 150
    g = Math.floor(100 - t * 50); // 100 -> 50
    b = Math.floor(125 - t * 80); // 125 -> 45
  } else if (timeOfDay < 0.9) {
    // Dusk to night
    const t = (timeOfDay - 0.75) / 0.15;
    r = Math.floor(150 - t * 145); // 150 -> 5
    g = Math.floor(50 - t * 45);   // 50 -> 5
    b = Math.floor(45 - t * 30);   // 45 -> 15
  } else {
    r = 5; g = 5; b = 15;
  }

  return `rgb(${r},${g},${b})`;
}

function skyBotColor(timeOfDay: number): string {
  let r: number, g: number, b: number;

  if (timeOfDay < 0.15 || timeOfDay > 0.9) {
    // Deep night
    r = 8; g = 8; b = 20;
  } else if (timeOfDay < 0.25) {
    const t = (timeOfDay - 0.15) / 0.1;
    r = Math.floor(8 + t * 80);
    g = Math.floor(8 + t * 40);
    b = Math.floor(20 + t * 25);
  } else if (timeOfDay < 0.35) {
    // Dawn - warm horizon
    const t = (timeOfDay - 0.25) / 0.1;
    r = Math.floor(88 + t * 80);  // 88 -> 168
    g = Math.floor(48 + t * 70);  // 48 -> 118
    b = Math.floor(45 + t * 40);  // 45 -> 85
  } else if (timeOfDay < 0.45) {
    // Dawn to noon
    const t = (timeOfDay - 0.35) / 0.1;
    r = Math.floor(168 - t * 120); // 168 -> 48
    g = Math.floor(118 + t * 60);  // 118 -> 178
    b = Math.floor(85 + t * 100);  // 85 -> 185
  } else if (timeOfDay < 0.55) {
    // Noon
    r = 48; g = 178; b = 185;
  } else if (timeOfDay < 0.65) {
    // Noon to dusk
    const t = (timeOfDay - 0.55) / 0.1;
    r = Math.floor(48 + t * 130);  // 48 -> 178
    g = Math.floor(178 - t * 60);  // 178 -> 118
    b = Math.floor(185 - t * 100); // 185 -> 85
  } else if (timeOfDay < 0.75) {
    // Dusk - red/orange horizon
    const t = (timeOfDay - 0.65) / 0.1;
    r = Math.floor(178 + t * 30);  // 178 -> 208
    g = Math.floor(118 - t * 70);  // 118 -> 48
    b = Math.floor(85 - t * 45);   // 85 -> 40
  } else if (timeOfDay < 0.9) {
    // Dusk to night
    const t = (timeOfDay - 0.75) / 0.15;
    r = Math.floor(208 - t * 200); // 208 -> 8
    g = Math.floor(48 - t * 40);   // 48 -> 8
    b = Math.floor(40 - t * 20);   // 40 -> 20
  } else {
    r = 8; g = 8; b = 20;
  }

  return `rgb(${r},${g},${b})`;
}

// Type alias for cell access in renderer
type Cell = {
  x: number;
  y: number;
  terrain: TerrainType;
  chamberType?: ChamberType;
  hardness: number;
  humidity: number;
  temperature: number;
  contamination: number;
  waterLevel: number;
  excavatable: boolean;
  explored: boolean;
  lightLevel: number;
  tunnelQuality: number;
  soilNutrients: number;
};
