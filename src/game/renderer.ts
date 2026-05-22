// ============================================================
// FerroNest - Canvas Renderer (Enhanced)
// ============================================================

import { GameState, TerrainType, AntCaste, AntState, ChamberType, PheromoneType, EnemyType, BroodStage } from './types';
import { MAP_WIDTH, MAP_HEIGHT, SURFACE_ROW, CELL_SIZE, CHAMBER_INFO, PHEROMONE_COLORS, ENEMY_STATS } from './constants';

// --- Color Palettes ---
const ANT_COLORS: Record<AntCaste, string> = {
  [AntCaste.Queen]: '#D4A017',
  [AntCaste.Worker]: '#8B4513',
  [AntCaste.Scout]: '#A0522D',
  [AntCaste.Soldier]: '#CD5C5C',
  [AntCaste.Nurse]: '#DEB887',
  [AntCaste.Builder]: '#B8860B',
  [AntCaste.Cultivator]: '#6B8E23',
};

const RESOURCE_COLORS: Record<string, string> = {
  food: '#8B6914',
  protein: '#CD853F',
  sugar: '#FFD700',
  water: '#4A90B8',
  fungus: '#7B9E6B',
};

// --- Particle System ---
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

const particles: Particle[] = [];
const MAX_PARTICLES = 200;

function addParticle(x: number, y: number, vx: number, vy: number, life: number, color: string, size: number = 1) {
  if (particles.length >= MAX_PARTICLES) return;
  particles.push({ x, y, vx, vy, life, maxLife: life, color, size });
}

function updateAndRenderParticles(ctx: CanvasRenderingContext2D) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.01; // slight gravity
    p.life--;

    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha * 0.6;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

// --- Main Render Function ---
export function renderGame(ctx: CanvasRenderingContext2D, state: GameState, canvasWidth: number, canvasHeight: number) {
  const { cameraX, cameraY, zoom, showPheromoneView } = state;

  ctx.save();
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Dark background
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

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

// --- Terrain ---
function renderTerrain(ctx: CanvasRenderingContext2D, state: GameState, cw: number, ch: number, camX: number, camY: number, zoom: number) {
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

      // Determine base color
      let color: string;

      switch (terrain) {
        case TerrainType.Sky: {
          const skyProgress = y / SURFACE_ROW;
          color = lerpColor('#0d1117', '#1a1a2e', skyProgress);
          break;
        }
        case TerrainType.SurfaceGrass:
          color = '#2d5a27';
          break;
        case TerrainType.SurfaceDirt:
          color = '#5c4033';
          break;
        case TerrainType.Dirt: {
          const depth = y - SURFACE_ROW;
          if (depth < 15) color = '#4a3528';
          else if (depth < 30) color = '#3e2723';
          else color = '#2c1b14';
          break;
        }
        case TerrainType.HardDirt:
          color = '#2c1b14';
          break;
        case TerrainType.Stone:
          color = '#4a4a4a';
          break;
        case TerrainType.Tunnel:
          color = '#1a1410';
          break;
        case TerrainType.Chamber:
          color = '#1a1410';
          break;
        case TerrainType.Water:
          color = '#1565C0';
          break;
        case TerrainType.Roots:
          color = '#3E2723';
          break;
        default:
          color = '#1a1410';
      }

      ctx.fillStyle = color;
      ctx.fillRect(px, py, CELL_SIZE + 0.5, CELL_SIZE + 0.5);

      // Add noise texture for dirt
      if (terrain === TerrainType.Dirt || terrain === TerrainType.HardDirt || terrain === TerrainType.SurfaceDirt) {
        const noise = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
        if (noise > 0.5) {
          ctx.fillStyle = `rgba(255,220,180,${0.02 + noise * 0.02})`;
          ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
        }
        if (noise < -0.3) {
          ctx.fillStyle = `rgba(0,0,0,0.05)`;
          ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
        }
      }

      // Tunnel/chamber walls with subtle highlight
      if (terrain === TerrainType.Tunnel || terrain === TerrainType.Chamber) {
        const above = state.map[y - 1]?.[x];
        const below = state.map[y + 1]?.[x];
        const left = state.map[y]?.[x - 1];
        const right = state.map[y]?.[x + 1];

        const isWall = (t: TerrainType | undefined) => t && t !== TerrainType.Tunnel && t !== TerrainType.Chamber && t !== TerrainType.Sky && t !== TerrainType.SurfaceGrass;

        // Top wall shadow
        if (isWall(above?.terrain)) {
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.fillRect(px, py, CELL_SIZE, 2);
        }
        // Bottom wall highlight
        if (isWall(below?.terrain)) {
          ctx.fillStyle = 'rgba(80,60,40,0.1)';
          ctx.fillRect(px, py + CELL_SIZE - 1, CELL_SIZE, 1);
        }
        // Left wall shadow
        if (isWall(left?.terrain)) {
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.fillRect(px, py, 1, CELL_SIZE);
        }
        // Right wall shadow
        if (isWall(right?.terrain)) {
          ctx.fillStyle = 'rgba(80,60,40,0.08)';
          ctx.fillRect(px + CELL_SIZE - 1, py, 1, CELL_SIZE);
        }
      }

      // Chamber type glow
      if (terrain === TerrainType.Chamber && cell.chamberType) {
        const info = CHAMBER_INFO[cell.chamberType];
        // Subtle colored tint
        ctx.fillStyle = info.color + '12';
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

        // Queen chamber gets golden glow
        if (cell.chamberType === ChamberType.QueenChamber) {
          const glowPulse = 0.03 + Math.sin(state.tick * 0.03) * 0.02;
          ctx.fillStyle = `rgba(212, 160, 23, ${glowPulse})`;
          ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
        }

        // Fungus chamber gets bioluminescent glow
        if (cell.chamberType === ChamberType.FungusChamber) {
          const glowPulse = 0.04 + Math.sin(state.tick * 0.02 + x * 0.1) * 0.02;
          ctx.fillStyle = `rgba(123, 158, 107, ${glowPulse})`;
          ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
        }
      }

      // Excavation progress indicator
      if (cell.excavatable && cell.hardness > 0 && cell.hardness < 1) {
        // Cracks
        const progress = 1 - cell.hardness;
        ctx.strokeStyle = `rgba(0,0,0,${progress * 0.4})`;
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
      }

      // Contamination overlay
      if (cell.contamination > 0.1) {
        ctx.fillStyle = `rgba(100, 150, 50, ${cell.contamination * 0.25})`;
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
      }
    }
  }

  // Surface line
  const surfaceY = 3 * CELL_SIZE;
  ctx.fillStyle = '#1e4a1a';
  ctx.fillRect(startCol * CELL_SIZE, surfaceY - 2, (endCol - startCol) * CELL_SIZE, 4);
  ctx.fillStyle = '#3a6b30';
  ctx.fillRect(startCol * CELL_SIZE, surfaceY - 1, (endCol - startCol) * CELL_SIZE, 2);

  // Grass blades
  ctx.strokeStyle = '#3a6b30';
  ctx.lineWidth = 1;
  for (let x = startCol; x < endCol; x++) {
    const hash = Math.sin(x * 7.77 + 3.33);
    if (hash > 0.2) {
      const gx = x * CELL_SIZE + (hash * 4 + 4);
      const gy = surfaceY;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.quadraticCurveTo(gx + Math.sin(x * 2.1) * 3, gy - 6, gx + Math.sin(x) * 2, gy - 8);
      ctx.stroke();
    }
  }

  // Roots in underground
  ctx.strokeStyle = 'rgba(62, 39, 35, 0.4)';
  ctx.lineWidth = 1.5;
  for (let x = startCol; x < endCol; x += 7) {
    const rootY = (SURFACE_ROW + 2) * CELL_SIZE;
    const hash = Math.sin(x * 3.14 + 1.57);
    if (hash > 0) {
      ctx.beginPath();
      ctx.moveTo(x * CELL_SIZE, rootY);
      ctx.bezierCurveTo(
        x * CELL_SIZE + 10, rootY + 15,
        x * CELL_SIZE - 5, rootY + 30,
        x * CELL_SIZE + hash * 20, rootY + 40
      );
      ctx.stroke();
    }
  }
}

// --- Surface Details ---
function renderSurface(ctx: CanvasRenderingContext2D, state: GameState) {
  // Stars
  for (let i = 0; i < 40; i++) {
    const sx = (Math.sin(i * 45.7 + 1.2) * 0.5 + 0.5) * MAP_WIDTH * CELL_SIZE;
    const sy = (Math.sin(i * 23.1 + 0.5) * 0.5 + 0.3) * (SURFACE_ROW - 2) * CELL_SIZE;
    const brightness = 0.15 + Math.sin(state.tick * 0.015 + i * 1.7) * 0.1;
    ctx.fillStyle = `rgba(255, 255, 220, ${brightness})`;
    const size = 0.5 + (Math.sin(i * 12.3) > 0.7 ? 1 : 0);
    ctx.fillRect(sx, sy, size, size);
  }

  // Moon
  const moonX = MAP_WIDTH * CELL_SIZE * 0.8;
  const moonY = CELL_SIZE * 1.5;
  ctx.fillStyle = 'rgba(255, 255, 230, 0.12)';
  ctx.beginPath();
  ctx.arc(moonX, moonY, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 230, 0.25)';
  ctx.beginPath();
  ctx.arc(moonX, moonY, 8, 0, Math.PI * 2);
  ctx.fill();
}

// --- Pheromones ---
function renderPheromones(ctx: CanvasRenderingContext2D, state: GameState) {
  if (state.pheromoneMap.size === 0) return;

  state.pheromoneMap.forEach((p) => {
    const px = p.x * CELL_SIZE;
    const py = p.y * CELL_SIZE;
    const color = PHEROMONE_COLORS[p.type];
    const hexStrength = Math.min(255, Math.floor(p.strength * (state.showPheromoneView ? 100 : 40))).toString(16).padStart(2, '0');

    ctx.fillStyle = color + hexStrength;
    ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
  });

  // If pheromone view, darken non-pheromone areas
  if (state.showPheromoneView) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
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

    // Glow
    ctx.fillStyle = color + '25';
    ctx.beginPath();
    ctx.arc(px + CELL_SIZE / 2, py + CELL_SIZE / 2, size + 4, 0, Math.PI * 2);
    ctx.fill();

    // Main deposit
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px + CELL_SIZE / 2, py + CELL_SIZE / 2, size, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.arc(px + CELL_SIZE / 2 - size * 0.2, py + CELL_SIZE / 2 - size * 0.2, size * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.max(6, size * 0.5)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const letter = deposit.type === 'food' ? 'F' : deposit.type === 'protein' ? 'P' : deposit.type === 'sugar' ? 'S' : 'W';
    ctx.fillText(letter, px + CELL_SIZE / 2, py + CELL_SIZE / 2);
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
    ctx.fillStyle = color + '30';
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
      ctx.arc(px + CELL_SIZE / 2, py + CELL_SIZE / 2, size + 1.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * brood.progress);
      ctx.stroke();
    }
  }
}

// --- Ants ---
function renderAnts(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const ant of state.ants) {
    if (ant.state === AntState.Dead) continue;

    const px = ant.x * CELL_SIZE;
    const py = ant.y * CELL_SIZE;
    const color = ANT_COLORS[ant.caste];
    const isQueen = ant.caste === AntCaste.Queen;
    const isSoldier = ant.caste === AntCaste.Soldier;

    const bodyLen = isQueen ? 8 : isSoldier ? 6 : 4;

    // Direction
    const hasPath = ant.path.length > ant.pathIndex;
    const dx = hasPath ? ant.path[ant.pathIndex].x * CELL_SIZE - px : 0;
    const dy = hasPath ? ant.path[ant.pathIndex].y * CELL_SIZE - py : 0;
    const angle = hasPath ? Math.atan2(dy, dx) : -Math.PI / 2;

    ctx.save();
    ctx.translate(px + CELL_SIZE / 2, py + CELL_SIZE / 2);
    ctx.rotate(angle);

    // Abdomen
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(-bodyLen * 0.3, 0, bodyLen * 0.4, bodyLen * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Thorax
    ctx.beginPath();
    ctx.ellipse(0, 0, bodyLen * 0.25, bodyLen * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.ellipse(bodyLen * 0.3, 0, bodyLen * 0.2, bodyLen * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;
    for (let i = -1; i <= 1; i++) {
      const legX = i * bodyLen * 0.15;
      const legAnim = Math.sin(state.tick * 0.3 + i * 2) * 1.5;
      // Top legs
      ctx.beginPath();
      ctx.moveTo(legX, bodyLen * 0.15);
      ctx.lineTo(legX + legAnim, bodyLen * 0.45);
      ctx.stroke();
      // Bottom legs
      ctx.beginPath();
      ctx.moveTo(legX, -bodyLen * 0.15);
      ctx.lineTo(legX - legAnim, -bodyLen * 0.45);
      ctx.stroke();
    }

    // Mandibles for soldiers/queen
    if (isSoldier || isQueen) {
      ctx.strokeStyle = color;
      ctx.lineWidth = isSoldier ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(bodyLen * 0.45, -bodyLen * 0.1);
      ctx.lineTo(bodyLen * 0.6, -bodyLen * 0.25);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bodyLen * 0.45, bodyLen * 0.1);
      ctx.lineTo(bodyLen * 0.6, bodyLen * 0.25);
      ctx.stroke();
    }

    // Antennae
    ctx.strokeStyle = color + 'CC';
    ctx.lineWidth = 0.5;
    const antAnim = Math.sin(state.tick * 0.2) * 1;
    ctx.beginPath();
    ctx.moveTo(bodyLen * 0.4, -bodyLen * 0.1);
    ctx.quadraticCurveTo(bodyLen * 0.55, -bodyLen * 0.2 + antAnim, bodyLen * 0.6, -bodyLen * 0.3 + antAnim);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bodyLen * 0.4, bodyLen * 0.1);
    ctx.quadraticCurveTo(bodyLen * 0.55, bodyLen * 0.2 - antAnim, bodyLen * 0.6, bodyLen * 0.3 - antAnim);
    ctx.stroke();

    // Eyes
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(bodyLen * 0.35, -bodyLen * 0.08, 0.5, 0, Math.PI * 2);
    ctx.arc(bodyLen * 0.35, bodyLen * 0.08, 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Carrying indicator
    if (ant.carrying) {
      ctx.fillStyle = RESOURCE_COLORS[ant.carrying] || '#FFD700';
      ctx.beginPath();
      ctx.arc(bodyLen * 0.5, -bodyLen * 0.3, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Queen crown glow
    if (isQueen) {
      const glowPulse = 0.08 + Math.sin(state.tick * 0.04) * 0.04;
      ctx.fillStyle = `rgba(212, 160, 23, ${glowPulse})`;
      ctx.beginPath();
      ctx.arc(px + CELL_SIZE / 2, py + CELL_SIZE / 2, 12, 0, Math.PI * 2);
      ctx.fill();

      // Crown
      ctx.fillStyle = '#FFD700';
      ctx.font = '8px serif';
      ctx.textAlign = 'center';
      ctx.fillText('♛', px + CELL_SIZE / 2, py - 2);
    }

    // Fighting indicator
    if (ant.state === AntState.Fighting) {
      ctx.fillStyle = `rgba(255, 50, 50, ${0.15 + Math.sin(state.tick * 0.3) * 0.1})`;
      ctx.beginPath();
      ctx.arc(px + CELL_SIZE / 2, py + CELL_SIZE / 2, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Health bar for damaged ants
    if (ant.health < ant.maxHealth * 0.8) {
      const barWidth = 8;
      const barHeight = 1.5;
      const barX = px + CELL_SIZE / 2 - barWidth / 2;
      const barY = py - 3;

      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(barX - 0.5, barY - 0.5, barWidth + 1, barHeight + 1);
      const healthRatio = ant.health / ant.maxHealth;
      ctx.fillStyle = healthRatio > 0.5 ? '#4CAF50' : healthRatio > 0.25 ? '#FF9800' : '#F44336';
      ctx.fillRect(barX, barY, barWidth * healthRatio, barHeight);
    }
  }
}

// --- Enemies ---
function renderEnemies(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const enemy of state.enemies) {
    if (enemy.health <= 0) continue;

    const stats = ENEMY_STATS[enemy.type];
    const px = enemy.x * CELL_SIZE;
    const py = enemy.y * CELL_SIZE;
    const size = stats.size * CELL_SIZE * 0.5;

    // Menacing glow
    ctx.fillStyle = 'rgba(255, 0, 0, 0.08)';
    ctx.beginPath();
    ctx.arc(px + CELL_SIZE / 2, py + CELL_SIZE / 2, size + 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = stats.color;

    if (enemy.type === EnemyType.Spider) {
      // Spider body
      ctx.beginPath();
      ctx.ellipse(px + CELL_SIZE / 2, py + CELL_SIZE / 2, size * 0.5, size * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      // Head
      ctx.beginPath();
      ctx.arc(px + CELL_SIZE / 2 + size * 0.4, py + CELL_SIZE / 2, size * 0.25, 0, Math.PI * 2);
      ctx.fill();
      // Legs
      ctx.strokeStyle = stats.color;
      ctx.lineWidth = 0.8;
      for (let i = 0; i < 4; i++) {
        const side = i < 2 ? 1 : -1;
        const legAngle = (i % 2 === 0 ? -0.3 : 0.3) + Math.sin(state.tick * 0.15 + i) * 0.15;
        // Top
        ctx.beginPath();
        ctx.moveTo(px + CELL_SIZE / 2, py + CELL_SIZE / 2);
        ctx.lineTo(px + CELL_SIZE / 2 + Math.cos(legAngle - Math.PI / 2) * size * side, py + CELL_SIZE / 2 + Math.sin(legAngle - Math.PI / 2) * size);
        ctx.stroke();
        // Bottom
        ctx.beginPath();
        ctx.moveTo(px + CELL_SIZE / 2, py + CELL_SIZE / 2);
        ctx.lineTo(px + CELL_SIZE / 2 + Math.cos(legAngle + Math.PI / 2) * size * side, py + CELL_SIZE / 2 - Math.sin(legAngle + Math.PI / 2) * size);
        ctx.stroke();
      }
      // Eyes
      ctx.fillStyle = '#FF0000';
      ctx.beginPath();
      ctx.arc(px + CELL_SIZE / 2 + size * 0.5, py + CELL_SIZE / 2 - 2, 1, 0, Math.PI * 2);
      ctx.arc(px + CELL_SIZE / 2 + size * 0.5, py + CELL_SIZE / 2 + 2, 1, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.type === EnemyType.Centipede) {
      for (let i = 0; i < 6; i++) {
        const sx = px + CELL_SIZE / 2 - i * 3;
        const sy = py + CELL_SIZE / 2 + Math.sin(state.tick * 0.2 + i * 0.8) * 2;
        ctx.beginPath();
        ctx.arc(sx, sy, size * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (enemy.type === EnemyType.Wasp) {
      // Wasp with wings
      ctx.beginPath();
      ctx.ellipse(px + CELL_SIZE / 2, py + CELL_SIZE / 2, size * 0.5, size * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      // Wings
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      const wingAnim = Math.sin(state.tick * 0.5) * 3;
      ctx.beginPath();
      ctx.ellipse(px + CELL_SIZE / 2, py + CELL_SIZE / 2 - size * 0.4 + wingAnim * 0.2, size * 0.5, size * 0.15, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(px + CELL_SIZE / 2, py + CELL_SIZE / 2 + size * 0.4 - wingAnim * 0.2, size * 0.5, size * 0.15, 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Generic circle
      ctx.beginPath();
      ctx.arc(px + CELL_SIZE / 2, py + CELL_SIZE / 2, size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Health bar
    const barWidth = size * 2;
    const barHeight = 2;
    const barX = px + CELL_SIZE / 2 - barWidth / 2;
    const barY = py - 4;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(barX - 0.5, barY - 0.5, barWidth + 1, barHeight + 1);
    ctx.fillStyle = enemy.health > enemy.maxHealth * 0.5 ? '#FF9800' : '#F44336';
    ctx.fillRect(barX, barY, barWidth * (enemy.health / enemy.maxHealth), barHeight);
  }
}

// --- Water Overlay ---
function renderWater(ctx: CanvasRenderingContext2D, state: GameState) {
  let hasWater = false;
  for (const row of state.map) {
    for (const cell of row) {
      if (cell.waterLevel > 0) { hasWater = true; break; }
    }
    if (hasWater) break;
  }
  if (!hasWater) return;

  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      const cell = state.map[y]?.[x];
      if (!cell || cell.waterLevel <= 0) continue;

      const px = x * CELL_SIZE;
      const py = y * CELL_SIZE;

      ctx.fillStyle = `rgba(21, 101, 192, ${cell.waterLevel * 0.45})`;
      ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

      // Water shimmer
      if (cell.waterLevel > 0.3) {
        const shimmer = Math.sin(state.tick * 0.08 + x * 0.5 + y * 0.3) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(100, 180, 255, ${shimmer * cell.waterLevel * 0.2})`;
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
        ctx.strokeStyle = 'rgba(100, 180, 255, 0.25)';
        ctx.lineWidth = 0.8;
        for (let i = 0; i < 80; i++) {
          const rx = ((Math.sin(i * 17.3) * 0.5 + 0.5) * MAP_WIDTH + Math.sin(state.tick * 0.01 + i) * 5) * CELL_SIZE;
          const ry = ((state.tick * 4 + i * 47) % (SURFACE_ROW * CELL_SIZE + 30));
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 1, ry + 5);
          ctx.stroke();
        }
        break;
      }
      case 'pesticide': {
        ctx.fillStyle = 'rgba(255, 20, 147, 0.08)';
        ctx.fillRect(0, 3 * CELL_SIZE, MAP_WIDTH * CELL_SIZE, 5 * CELL_SIZE);
        // Droplets
        for (let i = 0; i < 20; i++) {
          const dx = (Math.sin(i * 31.1 + state.tick * 0.05) * 0.5 + 0.5) * MAP_WIDTH * CELL_SIZE;
          const dy = (3 + Math.sin(i * 17.3 + state.tick * 0.03) * 2) * CELL_SIZE;
          ctx.fillStyle = 'rgba(255, 20, 147, 0.15)';
          ctx.beginPath();
          ctx.arc(dx, dy, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'cold_snap': {
        ctx.fillStyle = 'rgba(100, 150, 255, 0.04)';
        ctx.fillRect(0, 0, MAP_WIDTH * CELL_SIZE, MAP_HEIGHT * CELL_SIZE);
        break;
      }
      case 'heat_wave': {
        ctx.fillStyle = 'rgba(255, 69, 0, 0.03)';
        ctx.fillRect(0, 0, MAP_WIDTH * CELL_SIZE, MAP_HEIGHT * CELL_SIZE);
        break;
      }
      case 'drought': {
        ctx.fillStyle = 'rgba(210, 105, 30, 0.02)';
        ctx.fillRect(0, 0, MAP_WIDTH * CELL_SIZE, MAP_HEIGHT * CELL_SIZE);
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

      const key = cell.chamberType;
      if (labeledChambers.has(key)) continue;

      // Find center of chamber cluster
      let sumX = 0, sumY = 0, count = 0;
      for (const r of state.map) {
        for (const c of r) {
          if (c.chamberType === key && c.terrain === TerrainType.Chamber) {
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

        ctx.fillStyle = info.color + '60';
        ctx.font = 'bold 7px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(info.icon, cx, cy - 3);

        labeledChambers.add(key);
      }
    }
  }
}

// --- Ambient Particles ---
function spawnAmbientParticles(state: GameState) {
  // Dust particles in tunnels
  if (Math.random() < 0.05) {
    const tunnels: { x: number; y: number }[] = [];
    for (const row of state.map) {
      for (const cell of row) {
        if (cell.terrain === TerrainType.Tunnel || cell.terrain === TerrainType.Chamber) {
          tunnels.push({ x: cell.x, y: cell.y });
        }
      }
    }
    if (tunnels.length > 0) {
      const t = tunnels[Math.floor(Math.random() * tunnels.length)];
      addParticle(
        t.x * CELL_SIZE + Math.random() * CELL_SIZE,
        t.y * CELL_SIZE + Math.random() * CELL_SIZE,
        (Math.random() - 0.5) * 0.3,
        -Math.random() * 0.2,
        30 + Math.random() * 30,
        'rgba(180, 160, 120, 0.5)',
        1
      );
    }
  }

  // Fungus spores
  for (const row of state.map) {
    for (const cell of row) {
      if (cell.chamberType === ChamberType.FungusChamber && Math.random() < 0.002) {
        addParticle(
          cell.x * CELL_SIZE + Math.random() * CELL_SIZE,
          cell.y * CELL_SIZE + Math.random() * CELL_SIZE,
          (Math.random() - 0.5) * 0.5,
          -Math.random() * 0.3 - 0.1,
          50 + Math.random() * 50,
          'rgba(123, 158, 107, 0.6)',
          1.5
        );
      }
    }
  }

  // Queen chamber sparkle
  if (Math.random() < 0.01) {
    for (const row of state.map) {
      for (const cell of row) {
        if (cell.chamberType === ChamberType.QueenChamber) {
          addParticle(
            cell.x * CELL_SIZE + Math.random() * CELL_SIZE,
            cell.y * CELL_SIZE + Math.random() * CELL_SIZE,
            (Math.random() - 0.5) * 0.3,
            -Math.random() * 0.2 - 0.1,
            40,
            'rgba(212, 160, 23, 0.7)',
            1
          );
        }
      }
    }
  }
}

// --- Utility ---
function lerpColor(a: string, b: string, t: number): string {
  const ah = parseInt(a.slice(1), 16);
  const bh = parseInt(b.slice(1), 16);

  const ar = (ah >> 16) & 0xff;
  const ag = (ah >> 8) & 0xff;
  const ab = ah & 0xff;
  const br = (bh >> 16) & 0xff;
  const bg = (bh >> 8) & 0xff;
  const bb = bh & 0xff;

  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);

  return `rgb(${rr},${rg},${rb})`;
}
