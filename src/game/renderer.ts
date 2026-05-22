// ============================================================
// FerroNest - Canvas Renderer (Professional Edition)
// Fog of War, Day/Night Cycle, Minimap, Enhanced Particles
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

// --- Particle System ---
const particles: RenderParticle[] = [];
const MAX_PARTICLES = 500;

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
    }

    p.life--;

    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha * (p.type === 'glow' ? 0.4 : p.type === 'pheromone' ? 0.3 : p.type === 'bubble' ? 0.35 : 0.6);

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

  // Sky gradient based on time of day
  const skyGrad = ctx.createLinearGradient(0, 0, 0, SURFACE_ROW * CELL_SIZE * zoom - cameraY * zoom);
  const ambientLight = state.ambientLight;
  const skyTop = `rgb(${Math.floor(8 + ambientLight * 15)},${Math.floor(10 + ambientLight * 18)},${Math.floor(20 + ambientLight * 30)})`;
  const skyBot = `rgb(${Math.floor(15 + ambientLight * 25)},${Math.floor(15 + ambientLight * 25)},${Math.floor(35 + ambientLight * 40)})`;
  skyGrad.addColorStop(0, skyTop);
  skyGrad.addColorStop(1, skyBot);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvasWidth, Math.max(0, SURFACE_ROW * CELL_SIZE * zoom - cameraY * zoom));

  // Underground background
  ctx.fillStyle = '#080604';
  ctx.fillRect(0, Math.max(0, SURFACE_ROW * CELL_SIZE * zoom - cameraY * zoom), canvasWidth, canvasHeight);

  // Apply camera transform
  ctx.translate(-cameraX * zoom, -cameraY * zoom);
  ctx.scale(zoom, zoom);

  // Render terrain
  renderTerrain(ctx, state, canvasWidth, canvasHeight, cameraX, cameraY, zoom);

  // Render surface details
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

  // Render fog of war
  renderFogOfWar(ctx, state, canvasWidth, canvasHeight, cameraX, cameraY, zoom);

  // Render event effects
  renderEventEffects(ctx, state);

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
          color = lerpColor(skyTopColor(state.ambientLight), skyBotColor(state.ambientLight), skyProgress);
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
          if (depth < 15) color = lerpColor('#4a3528', '#3e2723', depth / 15);
          else if (depth < 30) color = lerpColor('#3e2723', '#2c1b14', (depth - 15) / 15);
          else color = '#2c1b14';
          // Variation
          const n = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
          color = lerpColor(color, n > 0 ? '#4a3828' : '#241810', Math.abs(n) * 0.15);
          break;
        }
        case TerrainType.HardDirt:
          color = '#2c1b14';
          break;
        case TerrainType.Stone:
          color = lerpColor('#3a3a3a', '#5a5a5a', (Math.sin(x * 3 + y * 5) * 0.5 + 0.5) * 0.2);
          break;
        case TerrainType.Tunnel: {
          // Subtle floor texture with faint dirt particles
          const tunnelNoise = (Math.sin(x * 23.17 + y * 57.31) * 43758.5453) % 1;
          color = lerpColor('#1a1410', '#1e1814', Math.abs(tunnelNoise) * 0.4);
          break;
        }
        case TerrainType.Chamber: {
          // Chamber floor tint based on chamber type
          let chamberBase = '#1a1410';
          if (cell.chamberType === ChamberType.FungusChamber) chamberBase = '#161a14';
          else if (cell.chamberType === ChamberType.Barracks) chamberBase = '#1a1210';
          else if (cell.chamberType === ChamberType.FoodStorage) chamberBase = '#1a1610';
          else if (cell.chamberType === ChamberType.WasteChamber) chamberBase = '#1a1a12';
          else if (cell.chamberType === ChamberType.HumidityChamber) chamberBase = '#141618';
          else if (cell.chamberType === ChamberType.NurseryChamber) chamberBase = '#1a1418';
          const chNoise = (Math.sin(x * 19.43 + y * 43.71) * 43758.5453) % 1;
          color = lerpColor(chamberBase, '#1e1814', Math.abs(chNoise) * 0.3);
          break;
        }
        case TerrainType.Water:
          color = '#0d47a1';
          break;
        case TerrainType.Roots:
          color = '#3E2723';
          break;
        case TerrainType.Clay:
          color = lerpColor('#8B5E3C', '#A0724E', (Math.sin(x * 5 + y * 3) * 0.5 + 0.5) * 0.2);
          break;
        case TerrainType.Sand:
          color = lerpColor('#B8A87A', '#C8B88A', (Math.sin(x * 7 + y * 2) * 0.5 + 0.5) * 0.15);
          break;
        default:
          color = '#1a1410';
      }

      ctx.fillStyle = color;
      ctx.fillRect(px, py, CELL_SIZE + 0.5, CELL_SIZE + 0.5);

      // Dirt texture noise
      if (terrain === TerrainType.Dirt || terrain === TerrainType.HardDirt || terrain === TerrainType.SurfaceDirt ||
        terrain === TerrainType.Clay || terrain === TerrainType.Sand) {
        const noise = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
        if (noise > 0.5) {
          ctx.fillStyle = `rgba(255,220,180,${0.015 + noise * 0.015})`;
          ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
        }
        if (noise < -0.3) {
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
      }

      // Stone cracks
      if (terrain === TerrainType.Stone) {
        const crack = (Math.sin(x * 17.3 + y * 31.7) * 43758.5453) % 1;
        if (crack > 0.7) {
          ctx.strokeStyle = 'rgba(30,30,30,0.3)';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(px + 2, py + 2);
          ctx.lineTo(px + CELL_SIZE - 2, py + CELL_SIZE - 2);
          ctx.stroke();
        }
      }

      // Tunnel/chamber floor texture (scattered dirt particles)
      if (terrain === TerrainType.Tunnel || terrain === TerrainType.Chamber) {
        const floorNoise = (Math.sin(x * 31.7 + y * 47.3) * 43758.5453) % 1;
        if (floorNoise > 0.6) {
          ctx.fillStyle = `rgba(140,110,70,${0.04 + Math.abs(floorNoise) * 0.03})`;
          const dotX = px + (floorNoise * 8 % CELL_SIZE);
          const dotY = py + ((floorNoise * 13) % CELL_SIZE);
          ctx.fillRect(dotX, dotY, 1, 1);
        }
        if (floorNoise < -0.5) {
          ctx.fillStyle = `rgba(60,40,20,0.06)`;
          const dotX = px + ((floorNoise * -7) % CELL_SIZE);
          const dotY = py + ((floorNoise * -11) % CELL_SIZE);
          ctx.fillRect(dotX, dotY, 1.5, 1);
        }
      }

      // Tunnel/chamber wall effects (enhanced ambient occlusion)
      if (terrain === TerrainType.Tunnel || terrain === TerrainType.Chamber) {
        renderWallEffects(ctx, state, cell, px, py);

        // Tunnel quality visual
        if (cell.tunnelQuality < 0.5 && terrain === TerrainType.Tunnel) {
          ctx.fillStyle = `rgba(80,60,40,${(1 - cell.tunnelQuality) * 0.12})`;
          ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
        }

        // Chamber type glow
        if (terrain === TerrainType.Chamber && cell.chamberType) {
          const info = CHAMBER_INFO[cell.chamberType];
          ctx.fillStyle = info.color + '10';
          ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

          if (cell.chamberType === ChamberType.QueenChamber) {
            const glowPulse = 0.04 + Math.sin(state.tick * 0.03) * 0.02;
            ctx.fillStyle = `rgba(212, 160, 23, ${glowPulse})`;
            ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
          }

          if (cell.chamberType === ChamberType.FungusChamber) {
            const glowPulse = 0.05 + Math.sin(state.tick * 0.02 + x * 0.1) * 0.03;
            ctx.fillStyle = `rgba(123, 158, 107, ${glowPulse})`;
            ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
          }

          if (cell.chamberType === ChamberType.Barracks) {
            const glowPulse = 0.03 + Math.sin(state.tick * 0.04) * 0.02;
            ctx.fillStyle = `rgba(139, 37, 0, ${glowPulse})`;
            ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
          }
        }
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
      const sway = Math.sin(state.tick * 0.02 + x * 0.5) * 1.5;

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

  // Underground roots (more naturally branching)
  ctx.strokeStyle = 'rgba(62, 39, 35, 0.35)';
  ctx.lineWidth = 1.5;
  for (let x = startCol; x < endCol; x += 5) {
    const rootY = (SURFACE_ROW + 2) * CELL_SIZE;
    const hash = Math.sin(x * 3.14 + 1.57);
    if (hash > 0.1) {
      const baseX = x * CELL_SIZE;
      // Main root
      const endX = baseX + hash * 20;
      const endY = rootY + 40 + hash * 8;
      ctx.beginPath();
      ctx.moveTo(baseX, rootY);
      ctx.bezierCurveTo(
        baseX + 10, rootY + 15 + hash * 10,
        baseX - 5, rootY + 30 + hash * 5,
        endX, endY
      );
      ctx.stroke();
      // Branch root 1
      if (hash > 0.3) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(62, 39, 35, 0.25)';
        const branchStart = rootY + 20 + hash * 5;
        ctx.beginPath();
        ctx.moveTo(baseX + 5, branchStart);
        ctx.quadraticCurveTo(baseX - 8, branchStart + 10, baseX - 10, branchStart + 18);
        ctx.stroke();
        // Branch root 2
        if (hash > 0.6) {
          ctx.beginPath();
          ctx.moveTo(baseX + 12, branchStart - 5);
          ctx.quadraticCurveTo(baseX + 18, branchStart + 5, baseX + 22, branchStart + 15);
          ctx.stroke();
        }
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(62, 39, 35, 0.35)';
      }
    }
  }
}

// --- Surface Details (Stars, Moon) ---
function renderSurface(ctx: CanvasRenderingContext2D, state: GameState) {
  const ambient = state.ambientLight;

  // Stars (only visible at night)
  if (ambient < 0.6) {
    const starAlpha = (0.6 - ambient) / 0.6;
    for (let i = 0; i < 60; i++) {
      const sx = (Math.sin(i * 45.7 + 1.2) * 0.5 + 0.5) * MAP_WIDTH * CELL_SIZE;
      const sy = (Math.sin(i * 23.1 + 0.5) * 0.5 + 0.3) * (SURFACE_ROW - 2) * CELL_SIZE;
      const brightness = (0.15 + Math.sin(state.tick * 0.015 + i * 1.7) * 0.1) * starAlpha;
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

// --- Pheromones ---
function renderPheromones(ctx: CanvasRenderingContext2D, state: GameState) {
  if (state.pheromoneMap.size === 0) return;

  state.pheromoneMap.forEach((p) => {
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
    // Use camera viewport to limit iteration
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
    const glowPulse = 1 + Math.sin(state.tick * 0.03 + deposit.x) * 0.2;
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
      const glowPulse = 0.08 + Math.sin(state.tick * 0.04) * 0.04;
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
      ctx.fillStyle = `rgba(255, 50, 50, ${0.12 + Math.sin(state.tick * 0.3) * 0.08})`;
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

// --- Water Overlay ---
function renderWater(ctx: CanvasRenderingContext2D, state: GameState) {
  const startCol = Math.max(0, Math.floor(state.cameraX / CELL_SIZE) - 1);
  const endCol = Math.min(MAP_WIDTH, Math.ceil((state.cameraX + 2000 / state.zoom) / CELL_SIZE) + 1);
  const startRow = Math.max(0, Math.floor(state.cameraY / CELL_SIZE) - 1);
  const endRow = Math.min(MAP_HEIGHT, Math.ceil((state.cameraY + 1200 / state.zoom) / CELL_SIZE) + 1);

  for (let y = startRow; y < endRow; y++) {
    for (let x = startCol; x < endCol; x++) {
      const cell = state.map[y]?.[x];
      if (!cell || cell.waterLevel <= 0) continue;

      const px = x * CELL_SIZE;
      const py = y * CELL_SIZE;

      ctx.fillStyle = `rgba(21, 101, 192, ${cell.waterLevel * 0.4})`;
      ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

      if (cell.waterLevel > 0.3) {
        const shimmer = Math.sin(state.tick * 0.08 + x * 0.5 + y * 0.3) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(100, 180, 255, ${shimmer * cell.waterLevel * 0.15})`;
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
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
          const rx = ((Math.sin(i * 17.3) * 0.5 + 0.5) * MAP_WIDTH + Math.sin(state.tick * 0.01 + i) * 5) * CELL_SIZE;
          const ry = ((state.tick * 4 + i * 47) % (SURFACE_ROW * CELL_SIZE + 30));
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
          const dx = (Math.sin(i * 31.1 + state.tick * 0.05) * 0.5 + 0.5) * MAP_WIDTH * CELL_SIZE;
          const dy = (3 + Math.sin(i * 17.3 + state.tick * 0.03) * 2) * CELL_SIZE;
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
          const fx = (Math.sin(i * 41.7 + state.tick * 0.02) * 0.5 + 0.5) * MAP_WIDTH * CELL_SIZE;
          const fy = (Math.sin(i * 23.1 + state.tick * 0.01) * 0.5 + 0.5) * MAP_HEIGHT * CELL_SIZE;
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
        const shake = Math.sin(state.tick * 2) * 2;
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

// --- Ambient Particles ---
function spawnAmbientParticles(state: GameState) {
  // Dust particles in tunnels
  if (Math.random() < 0.08) {
    const tunnels: { x: number; y: number }[] = [];
    for (let y = 0; y < MAP_HEIGHT; y += 3) {
      for (let x = 0; x < MAP_WIDTH; x += 3) {
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
        (Math.random() - 0.5) * 0.2,
        -Math.random() * 0.15,
        40 + Math.random() * 30,
        'rgba(180, 160, 120, 0.4)',
        1,
        'dust'
      );
    }
  }

  // Fungus spores
  if (Math.random() < 0.02) {
    for (let y = 0; y < MAP_HEIGHT; y += 5) {
      for (let x = 0; x < MAP_WIDTH; x += 5) {
        const cell = state.map[y]?.[x];
        if (cell?.chamberType === ChamberType.FungusChamber) {
          addParticle(
            cell.x * CELL_SIZE + Math.random() * CELL_SIZE,
            cell.y * CELL_SIZE + Math.random() * CELL_SIZE,
            (Math.random() - 0.5) * 0.4,
            -Math.random() * 0.2 - 0.05,
            60 + Math.random() * 40,
            'rgba(123, 158, 107, 0.5)',
            1.5,
            'spore'
          );
        }
      }
    }
  }

  // Queen chamber sparkle
  if (Math.random() < 0.015) {
    for (let y = 0; y < MAP_HEIGHT; y += 5) {
      for (let x = 0; x < MAP_WIDTH; x += 5) {
        const cell = state.map[y]?.[x];
        if (cell?.chamberType === ChamberType.QueenChamber) {
          addParticle(
            cell.x * CELL_SIZE + Math.random() * CELL_SIZE,
            cell.y * CELL_SIZE + Math.random() * CELL_SIZE,
            (Math.random() - 0.5) * 0.2,
            -Math.random() * 0.1 - 0.05,
            50,
            'rgba(212, 160, 23, 0.6)',
            1,
            'glow'
          );
        }
      }
    }
  }

  // Water area bubbles
  if (Math.random() < 0.04) {
    for (let y = 0; y < MAP_HEIGHT; y += 4) {
      for (let x = 0; x < MAP_WIDTH; x += 4) {
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

function skyTopColor(ambient: number): string {
  const r = Math.floor(8 + ambient * 15);
  const g = Math.floor(10 + ambient * 18);
  const b = Math.floor(20 + ambient * 30);
  return `rgb(${r},${g},${b})`;
}

function skyBotColor(ambient: number): string {
  const r = Math.floor(15 + ambient * 25);
  const g = Math.floor(15 + ambient * 25);
  const b = Math.floor(35 + ambient * 40);
  return `rgb(${r},${g},${b})`;
}
