// ============================================================
// FerroNest - Audio System (Web Audio API)
// Synthesized sound effects and ambient sounds
// ============================================================

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let ambientGain: GainNode | null = null;
let initialized = false;

// Ambient sound nodes (looping)
let ambientNodes: {
  undergroundHum: { source: AudioBufferSourceNode; gain: GainNode } | null;
  rain: { source: AudioBufferSourceNode; gain: GainNode } | null;
  surfaceBreeze: { source: AudioBufferSourceNode; gain: GainNode } | null;
} = {
  undergroundHum: null,
  rain: null,
  surfaceBreeze: null,
};

// Throttling for frequent sounds
const soundThrottles: Record<string, number> = {};
const THROTTLE_MS = 150;

// --- Initialization ---

export function initAudio() {
  if (initialized) return;
  try {
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(audioCtx.destination);

    sfxGain = audioCtx.createGain();
    sfxGain.gain.value = 0.7;
    sfxGain.connect(masterGain);

    ambientGain = audioCtx.createGain();
    ambientGain.gain.value = 0.3;
    ambientGain.connect(masterGain);

    initialized = true;
  } catch {
    // Web Audio not available
  }
}

export function isAudioInitialized(): boolean {
  return initialized;
}

// --- Volume Controls ---

export function setMasterVolume(v: number) {
  if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, v));
}

export function setSfxVolume(v: number) {
  if (sfxGain) sfxGain.gain.value = Math.max(0, Math.min(1, v));
}

export function setAmbientVolume(v: number) {
  if (ambientGain) ambientGain.gain.value = Math.max(0, Math.min(1, v));
}

export function getMasterVolume(): number {
  return masterGain?.gain.value ?? 0.5;
}

export function getSfxVolume(): number {
  return sfxGain?.gain.value ?? 0.7;
}

export function getAmbientVolume(): number {
  return ambientGain?.gain.value ?? 0.3;
}

// --- Sound Effect Synthesis ---

function createNoiseBuffer(duration: number, sampleRate?: number): AudioBuffer {
  const sr = sampleRate ?? audioCtx!.sampleRate;
  const length = Math.floor(sr * duration);
  const buffer = audioCtx!.createBuffer(1, length, sr);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function playSfx(source: AudioNode) {
  if (!sfxGain || !audioCtx) return;
  source.connect(sfxGain);
}

// Dig sound: low freq noise burst + filter sweep
function playDig() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  const noiseBuffer = createNoiseBuffer(0.15);
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(800, now);
  filter.frequency.exponentialRampToValueAtTime(150, now + 0.12);

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  noise.connect(filter);
  filter.connect(gain);
  playSfx(gain);
  noise.start(now);
  noise.stop(now + 0.15);
}

// Build sound: ascending tone + click
function playBuild() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  playSfx(gain);
  osc.connect(gain);
  osc.start(now);
  osc.stop(now + 0.12);

  // Click overlay
  const clickOsc = audioCtx.createOscillator();
  clickOsc.type = 'square';
  clickOsc.frequency.setValueAtTime(1200, now + 0.08);

  const clickGain = audioCtx.createGain();
  clickGain.gain.setValueAtTime(0.1, now + 0.08);
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

  playSfx(clickGain);
  clickOsc.connect(clickGain);
  clickOsc.start(now + 0.08);
  clickOsc.stop(now + 0.1);
}

// Combat hit: noise burst + low thump
function playCombatHit() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  // Thump
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(100, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);

  const oscGain = audioCtx.createGain();
  oscGain.gain.setValueAtTime(0.4, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

  playSfx(oscGain);
  osc.connect(oscGain);
  osc.start(now);
  osc.stop(now + 0.1);

  // Noise burst
  const noiseBuffer = createNoiseBuffer(0.06);
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 500;
  filter.Q.value = 2;

  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.25, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

  noise.connect(filter);
  filter.connect(noiseGain);
  playSfx(noiseGain);
  noise.start(now);
  noise.stop(now + 0.06);
}

// Combat kill: ascending arpeggio
function playCombatKill() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const notes = [523, 659, 784]; // C5, E5, G5

  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, now + i * 0.08);
    gain.gain.linearRampToValueAtTime(0.2, now + i * 0.08 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.15);

    playSfx(gain);
    osc.connect(gain);
    osc.start(now + i * 0.08);
    osc.stop(now + i * 0.08 + 0.15);
  });
}

// Ant hatch: soft pop/chirp
function playAntHatch() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.12);

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  playSfx(gain);
  osc.connect(gain);
  osc.start(now);
  osc.stop(now + 0.15);
}

// Pheromone mark: chemical spray sound
function playPheromoneMark() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  const noiseBuffer = createNoiseBuffer(0.2);
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(2000, now);
  filter.frequency.exponentialRampToValueAtTime(800, now + 0.15);
  filter.Q.value = 5;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.linearRampToValueAtTime(0.12, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

  noise.connect(filter);
  filter.connect(gain);
  playSfx(gain);
  noise.start(now);
  noise.stop(now + 0.2);
}

// Event warning: ominous descending tone
function playEventWarning() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  const osc = audioCtx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.5);

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1000, now);
  filter.frequency.exponentialRampToValueAtTime(300, now + 0.5);

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

  osc.connect(filter);
  filter.connect(gain);
  playSfx(gain);
  osc.start(now);
  osc.stop(now + 0.6);

  // Second beep
  const osc2 = audioCtx.createOscillator();
  osc2.type = 'sawtooth';
  osc2.frequency.setValueAtTime(500, now + 0.3);
  osc2.frequency.exponentialRampToValueAtTime(150, now + 0.8);

  const filter2 = audioCtx.createBiquadFilter();
  filter2.type = 'lowpass';
  filter2.frequency.value = 600;

  const gain2 = audioCtx.createGain();
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.setValueAtTime(0.12, now + 0.3);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

  osc2.connect(filter2);
  filter2.connect(gain2);
  playSfx(gain2);
  osc2.start(now + 0.3);
  osc2.stop(now + 0.8);
}

// Event start: bass hit + rise
function playEventStart() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  // Bass hit
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(60, now);
  osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.5, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

  playSfx(gain);
  osc.connect(gain);
  osc.start(now);
  osc.stop(now + 0.3);

  // Rise
  const osc2 = audioCtx.createOscillator();
  osc2.type = 'sawtooth';
  osc2.frequency.setValueAtTime(100, now);
  osc2.frequency.exponentialRampToValueAtTime(800, now + 0.4);

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(200, now);
  filter.frequency.exponentialRampToValueAtTime(2000, now + 0.4);

  const gain2 = audioCtx.createGain();
  gain2.gain.setValueAtTime(0.1, now);
  gain2.gain.linearRampToValueAtTime(0.2, now + 0.3);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

  osc2.connect(filter);
  filter.connect(gain2);
  playSfx(gain2);
  osc2.start(now);
  osc2.stop(now + 0.45);
}

// Queen damage: alarming beep pattern
function playQueenDamage() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  for (let i = 0; i < 3; i++) {
    const osc = audioCtx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 880;

    const gain = audioCtx.createGain();
    const t = now + i * 0.15;
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    playSfx(gain);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + 0.08);
  }
}

// Button click: short tick
function playButtonClick() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 1000;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

  playSfx(gain);
  osc.connect(gain);
  osc.start(now);
  osc.stop(now + 0.03);
}

// Speed change: whoosh sound
function playSpeedChange() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  const noiseBuffer = createNoiseBuffer(0.3);
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(300, now);
  filter.frequency.exponentialRampToValueAtTime(3000, now + 0.15);
  filter.frequency.exponentialRampToValueAtTime(300, now + 0.3);
  filter.Q.value = 3;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.05, now);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

  noise.connect(filter);
  filter.connect(gain);
  playSfx(gain);
  noise.start(now);
  noise.stop(now + 0.3);
}

// --- Sound Dispatch ---

const soundFunctions: Record<string, () => void> = {
  dig: playDig,
  build: playBuild,
  combat_hit: playCombatHit,
  combat_kill: playCombatKill,
  ant_hatch: playAntHatch,
  pheromone_mark: playPheromoneMark,
  event_warning: playEventWarning,
  event_start: playEventStart,
  queen_damage: playQueenDamage,
  button_click: playButtonClick,
  speed_change: playSpeedChange,
};

export function playSound(name: string) {
  if (!initialized || !audioCtx) return;

  // Throttle frequent sounds
  const now = Date.now();
  if (soundThrottles[name] && now - soundThrottles[name] < THROTTLE_MS) return;
  soundThrottles[name] = now;

  // Resume audio context if suspended (browser policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const fn = soundFunctions[name];
  if (fn) fn();
}

// --- Ambient Sounds ---

function createLoopingNoise(
  filterFreq: number,
  filterQ: number,
  filterType: BiquadFilterType,
  volume: number,
  duration: number = 4
): { source: AudioBufferSourceNode; gain: GainNode } | null {
  if (!audioCtx || !ambientGain) return null;

  const buffer = createNoiseBuffer(duration);
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = audioCtx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = filterFreq;
  filter.Q.value = filterQ;

  const gain = audioCtx.createGain();
  gain.gain.value = volume;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ambientGain);

  source.start();
  return { source, gain };
}

function startAmbientSound(key: 'undergroundHum' | 'rain' | 'surfaceBreeze') {
  if (!audioCtx || !ambientGain) return;
  if (ambientNodes[key]) return; // Already playing

  switch (key) {
    case 'undergroundHum':
      ambientNodes.undergroundHum = createLoopingNoise(80, 1, 'lowpass', 0.06, 6);
      break;
    case 'rain':
      ambientNodes.rain = createLoopingNoise(3000, 0.5, 'bandpass', 0.1, 4);
      // Add a second layer for rain texture
      if (ambientNodes.rain) {
        const buffer2 = createNoiseBuffer(3);
        const source2 = audioCtx.createBufferSource();
        source2.buffer = buffer2;
        source2.loop = true;

        const filter2 = audioCtx.createBiquadFilter();
        filter2.type = 'highpass';
        filter2.frequency.value = 2000;

        const gain2 = audioCtx.createGain();
        gain2.gain.value = 0.04;

        source2.connect(filter2);
        filter2.connect(gain2);
        gain2.connect(ambientGain);
        source2.start();
      }
      break;
    case 'surfaceBreeze':
      ambientNodes.surfaceBreeze = createLoopingNoise(400, 0.3, 'lowpass', 0.03, 8);
      break;
  }
}

function stopAmbientSound(key: 'undergroundHum' | 'rain' | 'surfaceBreeze') {
  const node = ambientNodes[key];
  if (node) {
    try {
      node.gain.gain.exponentialRampToValueAtTime(0.001, audioCtx!.currentTime + 0.5);
      setTimeout(() => {
        try { node.source.stop(); } catch { /* already stopped */ }
      }, 600);
    } catch { /* ignore */ }
    ambientNodes[key] = null;
  }
}

// Update ambient sounds based on game state
export function updateAmbient(state: {
  events?: { type: string }[];
  cameraY?: number;
  currentTick?: number;
}) {
  if (!initialized) return;

  // Rain ambient
  const hasRain = state.events?.some(e => e.type === 'rain' || e.type === 'flood');
  if (hasRain) {
    startAmbientSound('rain');
  } else {
    stopAmbientSound('rain');
  }

  // Underground hum when camera is underground
  const isUnderground = (state.cameraY ?? 0) > 100;
  if (isUnderground) {
    startAmbientSound('undergroundHum');
  } else {
    stopAmbientSound('undergroundHum');
  }

  // Surface breeze when camera is near surface
  if (!isUnderground) {
    startAmbientSound('surfaceBreeze');
  } else {
    stopAmbientSound('surfaceBreeze');
  }
}

// Stop all ambient sounds
export function stopAllAmbient() {
  stopAmbientSound('undergroundHum');
  stopAmbientSound('rain');
  stopAmbientSound('surfaceBreeze');
}
