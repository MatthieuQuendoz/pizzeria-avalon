/* ============================================
   PIZZERIA AVALON — L'Acchiappa Pizze
   Pure HTML5 Canvas 2D — zero external resources
   ============================================ */

// ─── CONSTANTS ─────────────────────────────────
const CANVAS_W = 390;
const CANVAS_H = 600;
const GROUND_Y = 500;
const KNIGHT_Y = 476;    // reference = belt center; feet land at +54 = GROUND_Y
const DESTROY_Y = 514;

const INITIAL_SPAWN_DELAY = 2200;
const MIN_SPAWN_DELAY = 480;
const INITIAL_KNIGHT_SPEED = 150;
const MAX_KNIGHT_SPEED = 340;
const FALL_SPEED = 190;
const DAY_CYCLE_MS = 120000;

// ─── AUDIO (Web Audio API, no file esterni) ─────
const AvalonAudio = (() => {
  let ctx = null;
  let enabled = true;

  function getCtx() {
    if (!ctx && typeof AudioContext !== 'undefined') {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { }
    }
    return ctx;
  }

  function resume() {
    const c = getCtx();
    if (!c) return;
    if (c.state === 'suspended' || c.state === 'interrupted') {
      c.resume().catch(() => {});
    }
  }

  function unlock() {
    const c = getCtx();
    if (!c) return;
    resume();
    try {
      const src = c.createBufferSource();
      src.buffer = c.createBuffer(1, 1, c.sampleRate);
      src.connect(c.destination);
      src.start(0);
    } catch (_) { }
  }

  function tone(freq, dur, type = 'sine', vol = 0.08) {
    const c = getCtx();
    if (!c || !enabled) return;
    if (c.state !== 'running') c.resume().catch(() => {});
    try {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(c.destination);
      gain.gain.setValueAtTime(vol, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      osc.start();
      osc.stop(c.currentTime + dur);
    } catch (_) { }
  }

  function noise(dur = 0.4, vol = 0.25) {
    const c = getCtx();
    if (!c || !enabled) return;
    if (c.state !== 'running') c.resume().catch(() => {});
    try {
      const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
      }
      const src = c.createBufferSource();
      const gain = c.createGain();
      gain.gain.value = vol;
      src.buffer = buf;
      src.connect(gain);
      gain.connect(c.destination);
      src.start();
    } catch (_) { }
  }

  function teardown() {
    if (ctx) {
      ctx.close().catch(() => {});
      ctx = null;
    }
  }

  return {
    resume,
    unlock,
    teardown,
    setEnabled(v) { enabled = v; },
    pizza() { tone(880, 0.08, 'triangle', 0.08); setTimeout(() => tone(1320, 0.08, 'triangle', 0.08), 50); },
    combo(l) { tone(700 + l * 120, 0.12, 'square', 0.06); },
    bomb() { noise(0.45, 0.3); tone(120, 0.35, 'sawtooth', 0.15); },
    click() { tone(520, 0.05, 'square', 0.04); },
    win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'triangle', 0.08), i * 90)); },
  };
})();

// ─── PIXEL ART HELPERS ─────────────────────────
const PIXEL = 4;

function stamp(ctx, rows, pal, ox, oy, sz) {
  const s = sz || PIXEL;
  rows.forEach((row, ry) => {
    row.forEach((c, rx) => {
      if (!c) return;
      ctx.fillStyle = pal[c];
      ctx.fillRect(ox + rx * s, oy + ry * s, s, s);
    });
  });
}

// ─── BACKGROUND IMAGE ──────────────────────────
let _bgImage = null;

// ─── ANIMATED BG: CLOUDS ───────────────────────
const CLOUD_SHAPE_LG = [
  [0,0,1,1,1,1,1,1,1,0,0,0],
  [0,1,1,1,1,1,1,1,1,1,1,0],
  [0,1,1,1,1,1,1,1,1,1,1,0],
  [0,0,1,1,1,1,1,1,1,1,0,0],
];
const CLOUD_SHAPE_MD = [
  [0,1,1,1,1,1,1,0],
  [1,1,1,1,1,1,1,1],
  [0,1,1,1,1,1,1,0],
];
const CLOUD_SHAPE_SM = [
  [0,1,1,1,1,0],
  [1,1,1,1,1,1],
  [0,1,1,1,1,0],
];

function genCloudsV2() {
  const shapes = [CLOUD_SHAPE_LG, CLOUD_SHAPE_MD, CLOUD_SHAPE_SM];
  return [
    { shape: CLOUD_SHAPE_LG, x:  20, y:  30, px: 3, speed:  6, alpha: 0.75 },
    { shape: CLOUD_SHAPE_MD, x: 180, y:  18, px: 3, speed:  9, alpha: 0.65 },
    { shape: CLOUD_SHAPE_SM, x: 300, y:  62, px: 2, speed:  5, alpha: 0.55 },
    { shape: CLOUD_SHAPE_LG, x: 260, y:  78, px: 2, speed:  4, alpha: 0.50 },
    { shape: CLOUD_SHAPE_MD, x:  90, y:  92, px: 2, speed:  7, alpha: 0.60 },
  ];
}

function drawClouds(ctx, t, dt) {
  _clouds.forEach(c => {
    c.x += c.speed * dt;
    const w = c.shape[0].length * c.px;
    if (c.x > CANVAS_W + 10) c.x = -w - 10;
    ctx.save();
    ctx.globalAlpha = c.alpha;
    stamp(ctx, c.shape, { 1: '#F8F4EC' }, Math.round(c.x), c.y, c.px);
    ctx.restore();
  });
}

// ─── ANIMATED BG: BIRDS ────────────────────────
const BIRD_FRAME_UP   = [[1,0,1],[0,1,0]];
const BIRD_FRAME_DOWN = [[0,0,0],[1,1,1]];

function spawnBird() {
  const fromLeft = Math.random() < 0.5;
  return {
    x: fromLeft ? -12 : CANVAS_W + 12,
    y: 20 + Math.random() * 110,
    vx: (fromLeft ? 1 : -1) * (16 + Math.random() * 10),
    flapPhase: Math.random() * Math.PI * 2,
    bobPhase: Math.random() * Math.PI * 2,
  };
}

function drawBirds(ctx, t, dt) {
  _birdSpawnTimer -= dt;
  if (_birdSpawnTimer <= 0 && _birds.length < 3) {
    _birds.push(spawnBird());
    if (Math.random() < 0.35) _birds.push(spawnBird()); // occasional pair
    _birdSpawnTimer = 7 + Math.random() * 8;
  }
  for (let i = _birds.length - 1; i >= 0; i--) {
    const b = _birds[i];
    b.x += b.vx * dt;
    if (b.x < -20 || b.x > CANVAS_W + 20) { _birds.splice(i, 1); continue; }
    const flap = Math.floor((t * 0.001 * 7 + b.flapPhase) % 2);
    const frame = flap === 0 ? BIRD_FRAME_UP : BIRD_FRAME_DOWN;
    const bob = Math.sin(t * 0.002 + b.bobPhase) * 1.5;
    stamp(ctx, frame, { 1: '#2A2018' }, Math.round(b.x), Math.round(b.y + bob), 3);
  }
}

// ─── ANIMATED BG: FALLING LEAVES ───────────────
const LEAF_COLORS = ['#C84820', '#D8802A', '#C0A018', '#E05028', '#A8581A'];
const LEAF_SHAPE = [
  [0,1,1,0],
  [1,1,1,1],
  [0,1,1,0],
];

function genLeavesV2() {
  return Array.from({ length: 7 }, () => ({
    baseX: Math.random() * CANVAS_W,
    y: Math.random() * CANVAS_H - CANVAS_H,
    vy: 22 + Math.random() * 18,
    swayAmp: 8 + Math.random() * 14,
    swayPhase: Math.random() * Math.PI * 2,
    color: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
    px: 2 + (Math.random() < 0.5 ? 0 : 1),
  }));
}

function drawLeaves(ctx, t, dt) {
  _leaves.forEach(l => {
    l.y += l.vy * dt;
    if (l.y > CANVAS_H + 8) {
      l.y = -10;
      l.baseX = Math.random() * CANVAS_W;
      l.color = LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)];
    }
    const x = l.baseX + Math.sin(t * 0.0015 + l.swayPhase) * l.swayAmp;
    stamp(ctx, LEAF_SHAPE, { 1: l.color }, Math.round(x), Math.round(l.y), l.px);
  });
}

// ─── ANIMATED BG: CHIMNEY SMOKE ────────────────
const SMOKE_X = 84;
const SMOKE_Y = 265;

function drawChimneySmoke(ctx, t, dt) {
  _smokeTimer -= dt;
  if (_smokeTimer <= 0) {
    _smokePuffs.push({
      x: SMOKE_X + (Math.random() - 0.5) * 4,
      y: SMOKE_Y,
      age: 0,
      life: 2.4 + Math.random() * 0.8,
      drift: (Math.random() - 0.5) * 6,
    });
    _smokeTimer = 0.22 + Math.random() * 0.12;
  }
  // sort oldest first → drawn under newer puffs
  _smokePuffs.sort((a, b) => b.age - a.age);
  for (let i = _smokePuffs.length - 1; i >= 0; i--) {
    const p = _smokePuffs[i];
    p.age += dt;
    p.y -= 14 * dt;
    p.x += p.drift * dt;
    if (p.age > p.life) { _smokePuffs.splice(i, 1); continue; }
    const k = p.age / p.life;
    const alpha = (1 - k) * 0.95;
    const sz = Math.round(6 + k * 10); // 6 → 16 px
    const col = k < 0.5 ? '#B8B0A8' : '#EFEAE2';
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(p.x - sz / 2), Math.round(p.y - sz / 2), sz, sz);
    ctx.restore();
  }
}

// ─── DRAW: BACKGROUND ──────────────────────────
function drawBackground(ctx, t, dt) {
  if (_bgImage && _bgImage.complete && _bgImage.naturalWidth) {
    const scale = Math.max(CANVAS_W / _bgImage.naturalWidth, CANVAS_H / _bgImage.naturalHeight);
    const dw = _bgImage.naturalWidth * scale;
    const dh = _bgImage.naturalHeight * scale;
    const dx = (CANVAS_W - dw) / 2;
    const dy = (CANVAS_H - dh) / 2;
    ctx.drawImage(_bgImage, dx, dy, dw, dh);
  } else {
    ctx.fillStyle = '#3A2A1A';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }
  drawClouds(ctx, t, dt);
  drawBirds(ctx, t, dt);
  drawChimneySmoke(ctx, t, dt);
  drawLeaves(ctx, t, dt);
}

// ─── KNIGHT PIXEL ART ──────────────────────────
const KNIGHT_PX = 5;      // screen pixels per logical pixel
const KNIGHT_COLS = 12;   // logical width
const KNIGHT_ROWS = 18;   // logical height
const KNIGHT_DW = KNIGHT_COLS * KNIGHT_PX;  // 60
const KNIGHT_DH = KNIGHT_ROWS * KNIGHT_PX;  // 90

// Palette: 0=transparent 1=silver-light 2=silver-mid 3=silver-dark 4=skin 5=gold 6=black 7=mustache-orange 8=sword-blade 9=brand-red
const K = { 1:'#D0DCE8', 2:'#6878A0', 3:'#2A3848', 4:'#F2A880', 5:'#D4A828', 6:'#0A0A0A', 7:'#E87020', 8:'#E8EAF4', 9:'#B12C16' };

// Head + body (rows 0–11): conical helmet, pink round face, huge mustache, silver armor, sword at rest (blade=col11 rows0-7, guard=cols10-11 row7, handle=col11 rows8-10, pommel=col11 row11)
const K_BODY = [
  [0,0,0,0,0,1,2,0,0,0,0,8],  // 0  helmet tip + sword blade
  [0,0,0,0,1,1,2,1,0,0,0,8],  // 1  helmet
  [0,0,0,1,2,1,1,2,1,0,0,8],  // 2  helmet
  [0,0,2,1,1,1,1,1,1,2,0,8],  // 3  helmet base wide
  [0,0,1,4,4,4,4,4,4,1,0,8],  // 4  face (skin) + armor frame
  [0,4,4,6,4,4,4,6,4,4,0,8],  // 5  eyes (dark pupils)
  [4,4,7,7,7,7,7,7,7,4,0,8],  // 6  HUGE mustache (7 orange pixels)
  [4,7,7,3,4,4,3,7,7,1,5,5],  // 7  drooping mustache + SWORD GUARD (gold cols10-11)
  [2,1,1,1,1,1,1,1,1,1,2,6],  // 8  wide shoulders (12 cols) + handle
  [1,1,2,5,1,1,1,5,2,1,0,6],  // 9  chest armor + gold "A" emblem
  [1,1,1,2,5,1,5,2,1,1,0,6],  // 10 belly + gold center detail
  [0,6,6,9,9,9,9,9,6,6,0,5],  // 11 belt (red+black) + pommel
];

// Catch: sword raised above head (guard at rows 0-1, blade off top)
const K_BODY_CATCH = [
  [0,0,0,0,0,1,2,0,0,0,5,5],  // 0  helmet + GUARD raised (gold cols10-11)
  [0,0,0,0,1,1,2,1,0,0,3,6],  // 1  helmet + arm up + handle
  [0,0,0,1,2,1,1,2,1,0,3,6],  // 2  helmet + arm
  [0,0,2,1,1,1,1,1,1,2,3,6],  // 3  helmet base + arm
  [0,0,1,4,4,4,4,4,4,1,3,5],  // 4  face + arm + pommel
  [0,4,4,6,4,4,4,6,4,4,3,0],  // 5  eyes + arm
  [4,4,7,7,7,7,7,7,7,4,3,0],  // 6  mustache + arm
  [4,7,7,3,4,4,3,7,7,1,0,0],  // 7  drooping mustache
  [2,1,1,1,1,1,1,1,1,1,2,0],  // 8  shoulders
  [1,1,2,5,1,1,1,5,2,1,0,0],  // 9  chest
  [1,1,1,2,5,1,5,2,1,1,0,0],  // 10 belly
  [0,6,6,9,9,9,9,9,6,6,0,0],  // 11 belt
];

// Hit: tilted, sword drooping down-right
const K_BODY_HIT = [
  [0,0,0,0,0,0,1,2,0,0,0,0],  // 0  helmet tilted
  [0,0,0,0,1,1,2,1,1,0,0,0],  // 1
  [0,0,0,1,2,1,1,2,1,0,0,0],  // 2
  [0,0,1,2,1,1,1,1,2,1,0,0],  // 3
  [0,0,1,4,4,4,4,4,4,0,0,0],  // 4  face
  [0,1,4,6,4,4,4,6,4,4,0,0],  // 5  eyes (sad)
  [0,4,7,7,7,7,7,7,7,4,0,0],  // 6  mustache
  [0,4,7,3,4,4,3,7,7,1,0,0],  // 7  drooping mustache
  [0,2,1,1,1,1,1,1,1,1,2,0],  // 8  shoulders
  [0,1,2,5,1,1,1,5,2,1,8,0],  // 9  chest + sword falling (blade col10)
  [0,1,1,2,5,1,5,2,1,0,8,0],  // 10 belly + sword
  [0,6,6,9,9,9,9,9,6,0,5,8],  // 11 belt + guard fallen (col10) + blade (col11)
];

// Legs frame A: left foot forward (12 cols)
const K_LEGS_A = [
  [0,0,1,1,0,0,0,1,1,0,0,0],  // 12
  [0,1,2,1,0,0,0,1,2,1,0,0],  // 13
  [0,6,6,0,0,0,0,0,6,6,0,0],  // 14
  [6,6,6,0,0,0,0,0,6,6,6,0],  // 15
  [6,6,0,0,0,0,0,0,0,6,6,6],  // 16 left foot forward, right back
  [0,0,0,0,0,0,0,0,0,0,0,0],  // 17
];

// Legs frame B: right foot forward (minimal difference → smooth alternation)
const K_LEGS_B = [
  [0,0,0,1,1,0,0,1,1,0,0,0],  // 12
  [0,0,1,2,1,0,0,1,2,1,0,0],  // 13
  [0,0,6,6,0,0,0,0,6,6,0,0],  // 14
  [0,6,6,6,0,0,0,0,6,6,6,0],  // 15
  [6,6,6,0,0,0,0,0,0,6,6,6],  // 16 right foot forward, left back
  [0,0,0,0,0,0,0,0,0,0,0,0],  // 17
];

// Legs hit: scomposte
const K_LEGS_HIT = [
  [0,0,0,1,1,0,1,1,0,0,0,0],  // 12
  [0,0,1,2,0,0,2,1,0,0,0,0],  // 13
  [0,6,6,0,0,0,0,6,6,0,0,0],  // 14
  [6,6,0,0,0,0,0,0,6,6,0,0],  // 15
  [0,0,0,0,0,0,0,0,0,0,0,0],  // 16
  [0,0,0,0,0,0,0,0,0,0,0,0],  // 17
];

function drawKnight(ctx, x, state, t, facingRight) {
  const sec = t * 0.001;
  const WALK_HZ = 3;

  const legFrame = (state === 'run') ? Math.floor(sec * WALK_HZ) % 2 : 0;
  const waddle   = (state === 'run') ? Math.round(Math.sin(sec * WALK_HZ * Math.PI) * 2) : 0;

  const body = state === 'catch' ? K_BODY_CATCH : state === 'hit' ? K_BODY_HIT : K_BODY;
  const legs = state === 'hit' ? K_LEGS_HIT : (legFrame === 0 ? K_LEGS_A : K_LEGS_B);
  const rows = [...body, ...legs];

  const ox = Math.round(x - KNIGHT_DW / 2);
  const oy = GROUND_Y - KNIGHT_DH + waddle;

  ctx.save();
  if (!facingRight) ctx.transform(-1, 0, 0, 1, x * 2, 0);

  stamp(ctx, rows, K, ox, oy, KNIGHT_PX);

  // Red flash on hit
  if (state === 'hit' && Math.sin(t * 0.028) > 0) {
    ctx.globalAlpha = 0.38;
    ctx.fillStyle = '#FF3030';
    rows.forEach((row, ry) => {
      row.forEach((c, rx) => {
        if (c) ctx.fillRect(ox + rx * KNIGHT_PX, oy + ry * KNIGHT_PX, KNIGHT_PX, KNIGHT_PX);
      });
    });
  }

  ctx.restore();
}


// ─── DRAW: PIZZA PIXEL ART (3 variants) ────────
const PIZZA_PX = 4;
// Palette: 1=crust, 2=sauce-red, 3=cheese, 4=dark-crust, 5=mozzarella, 6=basil, 7=pepperoni, 8=quattro
const P_PAL = { 1:'#C87830', 2:'#C83020', 3:'#E8D878', 4:'#8B4818', 5:'#F5EFD8', 6:'#2A6818', 7:'#8B1808', 8:'#E8C858' };

// 10×10 pizza frames
const PIZZA_MARGHERITA = [
  [0,0,1,1,1,1,1,1,0,0],
  [0,1,2,2,2,2,2,2,1,0],
  [1,2,5,2,5,2,2,5,2,1],
  [1,2,2,5,2,2,5,2,2,1],
  [1,2,6,2,2,5,2,2,6,1],
  [1,2,2,2,5,2,2,2,2,1],
  [1,2,5,2,2,2,5,2,2,1],
  [0,1,2,2,5,2,2,2,1,0],
  [0,0,1,1,1,1,1,1,0,0],
  [0,0,0,0,0,0,0,0,0,0],
];

const PIZZA_PEPPERONI = [
  [0,0,1,1,1,1,1,1,0,0],
  [0,1,2,2,2,2,2,2,1,0],
  [1,2,7,2,2,7,2,2,2,1],
  [1,2,2,2,7,2,2,7,2,1],
  [1,2,2,7,2,2,7,2,2,1],
  [1,2,7,2,2,7,2,2,7,1],
  [1,2,2,2,7,2,2,2,2,1],
  [0,1,2,7,2,2,7,2,1,0],
  [0,0,1,1,1,1,1,1,0,0],
  [0,0,0,0,0,0,0,0,0,0],
];

const PIZZA_FORMAGGI = [
  [0,0,1,1,1,1,1,1,0,0],
  [0,1,8,8,4,3,3,3,1,0],
  [1,8,8,8,4,3,3,3,3,1],
  [1,8,8,8,4,3,3,3,3,1],
  [1,4,4,4,4,4,4,4,4,1],
  [1,5,5,5,4,8,8,8,8,1],
  [1,5,5,5,4,8,8,8,8,1],
  [0,1,5,5,4,8,8,8,1,0],
  [0,0,1,1,1,1,1,1,0,0],
  [0,0,0,0,0,0,0,0,0,0],
];

const PIZZA_FRAMES = [PIZZA_MARGHERITA, PIZZA_PEPPERONI, PIZZA_FORMAGGI];

function drawPizza(ctx, x, y, variant, rotation, glowing) {
  const frame = PIZZA_FRAMES[variant % 3];
  const size = frame.length * PIZZA_PX;
  const ox = Math.round(x - size / 2);
  const oy = Math.round(y - size / 2);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.round(rotation / (Math.PI / 2)) * (Math.PI / 2)); // snap rotation to 90° steps
  ctx.translate(-x, -y);

  if (glowing) {
    ctx.fillStyle = 'rgba(255,200,80,0.25)';
    ctx.fillRect(ox - PIZZA_PX * 2, oy - PIZZA_PX * 2, size + PIZZA_PX * 4, size + PIZZA_PX * 4);
  }

  stamp(ctx, frame, P_PAL, ox, oy, PIZZA_PX);
  ctx.restore();
}

// ─── DRAW: BOMB PIXEL ART ──────────────────────
const BOMB_PX = 4;
const B_PAL = { 1:'#181818', 2:'#282828', 3:'#7B5B30', 4:'#FFD700', 5:'#FF6820', 6:'#FFFFFF' };

const BOMB_FRAME = [
  [0,0,0,3,3,0,0,0],  // 0 fuse
  [0,0,0,0,3,0,0,0],  // 1
  [0,0,1,1,1,1,0,0],  // 2 body top
  [0,1,2,1,1,2,1,0],  // 3
  [1,2,1,1,1,1,2,1],  // 4 highlight
  [1,2,1,6,1,1,2,1],  // 5
  [1,2,1,1,1,1,2,1],  // 6
  [0,1,2,1,1,2,1,0],  // 7
  [0,0,1,1,1,1,0,0],  // 8 body bottom
  [0,0,0,0,0,0,0,0],
];

const BOMB_SPARK_ON = [
  [0,0,0,4,0,0,0,0],
  [0,0,4,5,4,0,0,0],
  [0,0,0,4,0,0,0,0],
];

const BOMB_SPARK_OFF = [
  [0,0,0,5,0,0,0,0],
  [0,0,0,5,0,0,0,0],
  [0,0,0,0,0,0,0,0],
];

const B_PAL_OUTLINE = { 1:'#B12C17', 2:'#B12C17', 3:'#B12C17', 4:'#B12C17', 5:'#B12C17', 6:'#B12C17' };
const BOMB_OUTLINE_OFFSETS = [[-1,0],[1,0],[0,-1],[0,1]];

function drawBomb(ctx, x, y, t) {
  const sparkOn = Math.floor(t * 0.006) % 2 === 0;
  const spark = sparkOn ? BOMB_SPARK_ON : BOMB_SPARK_OFF;
  const total = [...spark, ...BOMB_FRAME];
  const size = 8 * BOMB_PX;
  const ox = Math.round(x - size / 2);
  const oy = Math.round(y - size / 2 - BOMB_PX * 3);
  // red outline (4 cardinal offsets)
  BOMB_OUTLINE_OFFSETS.forEach(([dx, dy]) => {
    stamp(ctx, total, B_PAL_OUTLINE, ox + dx * BOMB_PX, oy + dy * BOMB_PX, BOMB_PX);
  });
  // bomb body on top
  stamp(ctx, total, B_PAL, ox, oy, BOMB_PX);
}

// ─── PARTICLES ─────────────────────────────────
function updateAndDrawParticles(ctx, dt) {
  for (let i = _particles.length - 1; i >= 0; i--) {
    const p = _particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt;
    if (p.life <= 0) { _particles.splice(i, 1); continue; }
    ctx.save(); ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color; ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * (p.life / p.max), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}
function spawnPizzaParticles(x, y) {
  const cols = ['#F2C878', '#E85C42', '#F8E4A0', '#D9A05C', '#3B6B2C'];
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 140;
    _particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 50,
      r: 3 + Math.random() * 3, color: cols[Math.floor(Math.random() * cols.length)],
      life: 0.5 + Math.random() * 0.3, max: 0.8
    });
  }
}
function spawnBombParticles(x, y) {
  const cols = ['#FF6B35', '#FFD700', '#7A1E14', '#FF3030', '#FFA040'];
  for (let i = 0; i < 30; i++) {
    const a = Math.random() * Math.PI * 2, sp = 120 + Math.random() * 260;
    _particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 90,
      r: 4 + Math.random() * 4, color: cols[Math.floor(Math.random() * cols.length)],
      life: 0.7 + Math.random() * 0.5, max: 1.2
    });
  }
}

// ─── CONFETTI (victory celebration) ────────────
const CONFETTI_COLORS = ['#B12C16', '#D4A828', '#3F6833', '#E87020', '#F8F4EC', '#2A6818'];
function spawnConfetti(n) {
  for (let i = 0; i < n; i++) {
    _confetti.push({
      x: CANVAS_W / 2 + (Math.random() - 0.5) * CANVAS_W * 0.6,
      y: -10 + Math.random() * 40,
      vx: (Math.random() - 0.5) * 220,
      vy: 40 + Math.random() * 120,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 8,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 6 + Math.random() * 6,
      life: 3.5 + Math.random() * 1.5, max: 5,
    });
  }
}
function updateAndDrawConfetti(ctx, dt) {
  for (let i = _confetti.length - 1; i >= 0; i--) {
    const p = _confetti[i];
    p.vy += 280 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.rot += p.vrot * dt;
    p.life -= dt;
    if (p.life <= 0 || p.y > CANVAS_H + 20) { _confetti.splice(i, 1); continue; }
    ctx.save();
    ctx.globalAlpha = Math.min(1, p.life / 1.2);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6);
    ctx.restore();
  }
}

// ─── FLOATING TEXT ─────────────────────────────
function updateAndDrawTexts(ctx, dt) {
  for (let i = _ftexts.length - 1; i >= 0; i--) {
    const f = _ftexts[i];
    f.y -= 38 * dt; f.life -= dt;
    if (f.life <= 0) { _ftexts.splice(i, 1); continue; }
    ctx.save(); ctx.globalAlpha = Math.min(1, f.life / 0.3);
    ctx.font = `bold ${f.sz}px 'Aleo',serif`; ctx.textAlign = 'center';
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3; ctx.strokeText(f.txt, f.x, f.y);
    ctx.fillStyle = f.color; ctx.fillText(f.txt, f.x, f.y);
    ctx.restore();
  }
}
function addText(x, y, txt, color, sz = 22) {
  _ftexts.push({ x, y, txt, color, sz, life: 0.85, max: 0.85 });
}

// ─── ROUNDED RECT HELPER ───────────────────────
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

// ─── DRAW: GAME OVER PANEL ─────────────────────
function drawGameOverPanel(ctx, score, isRecord, prevBest) {
  ctx.fillStyle = 'rgba(0,0,0,0.58)'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const pw = 300, ph = isRecord ? 344 : 300;
  const px = (CANVAS_W - pw) / 2, py = (CANVAS_H - ph) / 2;

  ctx.fillStyle = '#FDF6EE'; rrect(ctx, px, py, pw, ph, 20); ctx.fill();
  ctx.strokeStyle = '#B12C16'; ctx.lineWidth = 3; ctx.stroke();

  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = "bold italic 32px 'Aleo',serif"; ctx.fillStyle = '#2D1D1D';
  ctx.fillText('Game Over', CANVAS_W / 2, py + 48);

  ctx.font = "22px 'Aleo',serif"; ctx.fillStyle = '#5A413C';
  ctx.fillText(`Punteggio: ${score}`, CANVAS_W / 2, py + 92);

  let ty = py + 136;
  if (isRecord) {
    ctx.font = "bold 18px 'Aleo',serif"; ctx.fillStyle = '#B12C16';
    ctx.fillText('🏆 Nuovo record!', CANVAS_W / 2, ty); ty += 38;
  } else if (prevBest > 0) {
    ctx.font = "15px 'Aleo',serif"; ctx.fillStyle = '#8A7A68';
    ctx.fillText(`Il tuo record: ${prevBest}`, CANVAS_W / 2, ty); ty += 38;
  }

  // Retry button
  const bW = 200, bH = 52, bX = (CANVAS_W - bW) / 2, bY = py + ph - 50;
  ctx.fillStyle = _retryHover ? '#D64A32' : '#B12C16';
  rrect(ctx, bX, bY - bH / 2, bW, bH, 26); ctx.fill();
  ctx.font = "bold 20px 'Aleo',serif"; ctx.fillStyle = '#FFFFFF';
  ctx.fillText('Riprova', CANVAS_W / 2, bY);

  _retryZone = { x: bX, y: bY - bH / 2, w: bW, h: bH };
}

// ─── HINT OVERLAY ──────────────────────────────
function drawHint(ctx, timer) {
  const a = timer > 3.2 ? (3.5 - timer) / 0.3 : timer < 0.5 ? timer / 0.5 : 1;
  ctx.save(); ctx.globalAlpha = a * 0.94;
  ctx.fillStyle = '#B12C16'; rrect(ctx, CANVAS_W / 2 - 130, CANVAS_H / 2 - 56, 260, 52, 26); ctx.fill();
  ctx.font = "bold 15px 'Aleo',serif"; ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('Tocca per cambiare direzione!', CANVAS_W / 2, CANVAS_H / 2 - 30);
  ctx.restore();
}

// ─── GAME STATE ────────────────────────────────
let _canvas = null, _ctx = null, _animFrame = null, _lastTs = 0, _startTs = 0;
let _knightAnim = { hitStartTs: 0 };
let _clouds = [], _leaves = [];
let _birds = [], _birdSpawnTimer = 0;
let _smokePuffs = [], _smokeTimer = 0;
let _knight = { x: 80, speed: INITIAL_KNIGHT_SPEED, movingRight: true, state: 'idle', stateTimer: 0 };
let _objects = [], _spawnTimer = INITIAL_SPAWN_DELAY, _spawnDelay = INITIAL_SPAWN_DELAY, _bombChance = 0.30, _combo = 0;
let _score = 0, _isGameOver = false, _hasCelebrated = false, _showPanel = false;
let _scoreSubmitted = false;
let _isRecord = false, _prevBest = 0, _playerName = 'Giocatore';
let _particles = [], _ftexts = [];
let _retryZone = null, _retryHover = false;
let _shakeX = 0, _shakeY = 0, _shakeDur = 0;
let _hintTimer = 0, _showHint = false;
let _isVictoryPaused = false, _confetti = [], _confettiBurstTimer = 0;
let _gameRunning = false, _gameOverPanelTimer = null, _inputHandlers = null;
let _resumeAfterPageShow = false;

function pauseGame() {
  if (!_gameRunning) return;
  _gameRunning = false;
  if (_animFrame) {
    cancelAnimationFrame(_animFrame);
    _animFrame = null;
  }
}

function resumePausedGame() {
  if (_gameRunning || !_canvas) return;
  _gameRunning = true;
  _lastTs = performance.now();
  AvalonAudio.resume();
  _animFrame = requestAnimationFrame(gameLoop);
}

// ─── GAME LOOP ─────────────────────────────────
function gameLoop(ts) {
  if (!_gameRunning) return;
  const dt = Math.min((ts - _lastTs) / 1000, 0.05);
  _lastTs = ts;
  const gameT = ts - _startTs;

  // Screen shake
  if (_shakeDur > 0) {
    _shakeDur -= dt;
    _shakeX = (Math.random() - 0.5) * _shakeDur * 14;
    _shakeY = (Math.random() - 0.5) * _shakeDur * 14;
  } else { _shakeX = 0; _shakeY = 0; }

  _ctx.save(); _ctx.translate(_shakeX, _shakeY);

  drawBackground(_ctx, gameT, dt);

  if (!_isGameOver) {
    if (!_isVictoryPaused) {
      updateKnight(dt);
      updateObjects(dt);
    }

    // Falling objects (behind knight)
    _objects.forEach(obj => {
      const near = Math.abs(obj.x - _knight.x) < 90 && obj.y > GROUND_Y - KNIGHT_DH - 80;
      if (obj.type === 'pizza') drawPizza(_ctx, obj.x, obj.y, obj.variant, obj.rot, near);
      else drawBomb(_ctx, obj.x, obj.y, ts);
    });

    drawKnight(_ctx, _knight.x, _knight.state, ts, _knight.movingRight);

    updateAndDrawParticles(_ctx, dt);
    updateAndDrawTexts(_ctx, dt);

    // Confetti during victory pause (and after, until faded)
    if (_isVictoryPaused) {
      _confettiBurstTimer -= dt;
      if (_confettiBurstTimer <= 0) {
        spawnConfetti(40);
        _confettiBurstTimer = 1.4;
      }
    }
    updateAndDrawConfetti(_ctx, dt);

    // Hint
    if (_showHint && _hintTimer > 0) {
      drawHint(_ctx, _hintTimer);
      _hintTimer -= dt;
      if (_hintTimer <= 0) _showHint = false;
    }
  } else {
    // Frozen
    _objects.forEach(obj => {
      if (obj.type === 'pizza') drawPizza(_ctx, obj.x, obj.y, obj.variant, obj.rot, false);
      else drawBomb(_ctx, obj.x, obj.y, ts);
    });
    drawKnight(_ctx, _knight.x, 'hit', ts, _knight.movingRight);
    updateAndDrawParticles(_ctx, dt);
    updateAndDrawTexts(_ctx, dt);
    if (_showPanel) drawGameOverPanel(_ctx, _score, _isRecord, _prevBest);
  }

  _ctx.restore();

  if (_gameRunning) {
    _animFrame = requestAnimationFrame(gameLoop);
  }
}

// ─── UPDATE: KNIGHT ────────────────────────────
function updateKnight(dt) {
  _knight.x += (_knight.movingRight ? 1 : -1) * _knight.speed * dt;
  const m = 32;
  if (_knight.x > CANVAS_W - m && _knight.movingRight) _knight.movingRight = false;
  if (_knight.x < m && !_knight.movingRight) _knight.movingRight = true;

  if (_knight.state === 'catch' || _knight.state === 'hit') {
    _knight.stateTimer -= dt;
    if (_knight.stateTimer <= 0) _knight.state = 'run';
  } else {
    _knight.state = 'run';
  }
}

// ─── UPDATE: OBJECTS ───────────────────────────
function updateObjects(dt) {
  _spawnTimer -= dt * 1000;
  if (_spawnTimer <= 0) { spawnObject(); _spawnTimer = _spawnDelay; }

  for (let i = _objects.length - 1; i >= 0; i--) {
    const obj = _objects[i];
    obj.x += obj.vx * dt; obj.y += obj.vy * dt; obj.rot += obj.vr * dt;
    if (obj.x < 24 && obj.vx < 0) obj.vx = Math.abs(obj.vx);
    if (obj.x > CANVAS_W - 24 && obj.vx > 0) obj.vx = -Math.abs(obj.vx);
    if (obj.y > DESTROY_Y) {
      if (obj.type === 'pizza') _combo = 0;
      _objects.splice(i, 1); continue;
    }
    const catchY = GROUND_Y - KNIGHT_DH * 0.5;
    const dx = obj.x - _knight.x, dy = obj.y - catchY;
    if (dx * dx + dy * dy < (obj.type === 'pizza' ? 48 : 40) ** 2) {
      if (obj.type === 'pizza') { catchPizza(obj, i); }
      else { hitBomb(obj); return; }
    }
  }
}

// ─── SPAWN ─────────────────────────────────────
function spawnObject() {
  _objects.push({
    x: 40 + Math.random() * (CANVAS_W - 80), y: -32,
    vx: (Math.random() - 0.5) * 80, vy: FALL_SPEED,
    rot: 0, vr: (Math.random() - 0.5) * 3,
    type: Math.random() < _bombChance ? 'bomb' : 'pizza',
    variant: Math.floor(Math.random() * 3),
  });
}

// ─── CATCH PIZZA ───────────────────────────────
function catchPizza(obj, idx) {
  const { x, y } = obj; _objects.splice(idx, 1);
  _score++; _combo++;
  AvalonAudio.pizza();
  spawnPizzaParticles(x, y);
  addText(x, y - 10, '+1', '#2E7D32');
  if (_combo >= 3) {
    AvalonAudio.combo(Math.min(_combo - 2, 5));
    addText(_knight.x, KNIGHT_Y - 55, `Combo x${_combo}!`, '#B12C16', 20);
  }
  _knight.state = 'catch'; _knight.stateTimer = 0.3;
  // Smooth difficulty ramp: factor 1.0 → 2.2 between score 40 and 60
  const accelFactor = _score < 40 ? 1.0 : 1.0 + Math.min(1.2, (_score - 40) / 20 * 1.2);
  _spawnDelay = Math.max(MIN_SPAWN_DELAY, _spawnDelay - 30 * accelFactor);
  _knight.speed = Math.min(MAX_KNIGHT_SPEED, _knight.speed + 4 * accelFactor);
  _bombChance = Math.min(0.55, _bombChance + 0.01 * accelFactor);
  if (typeof updateHUD === 'function') updateHUD(_score);
  if (!_hasCelebrated && _score >= TARGET_SCORE) {
    _hasCelebrated = true;
    _isVictoryPaused = true;
    AvalonAudio.win();
    spawnConfetti(80);
    if (typeof showVictoryModal === 'function') showVictoryModal();
  }
}

// ─── SALVATAGGIO PUNTEGGIO ─────────────────────
// Registra record personale e invia il punteggio alla classifica.
// Chiamato sia alla morte (bomba) sia quando si vince e si termina dalla
// schermata vittoria. La guardia evita doppi invii dello stesso punteggio.
function finalizeScore() {
  if (_scoreSubmitted) return;
  _scoreSubmitted = true;
  const pb = typeof getPlayerBest === 'function' ? getPlayerBest() : 0;
  _prevBest = pb; _isRecord = _score > pb;
  if (_isRecord && typeof savePlayerBest === 'function') savePlayerBest(_score);
  if (typeof leaderboardApi !== 'undefined')
    leaderboardApi.submitScore(_playerName, _score)
      .then(() => { if (typeof renderLeaderboard === 'function') renderLeaderboard(); });
}

// ─── HIT BOMB ──────────────────────────────────
function hitBomb(obj) {
  spawnBombParticles(obj.x, obj.y);
  _isGameOver = true; _shakeDur = 0.45;
  _knightAnim.hitStartTs = _lastTs;
  AvalonAudio.bomb();
  _objects.forEach(o => { o.vy = 0; o.vx = 0; o.vr = 0; });
  _knight.state = 'hit'; _knight.stateTimer = 9999;

  finalizeScore();
  if (_gameOverPanelTimer) clearTimeout(_gameOverPanelTimer);
  _gameOverPanelTimer = setTimeout(() => {
    _gameOverPanelTimer = null;
    if (_gameRunning) _showPanel = true;
  }, 820);
}

// ─── INPUT ─────────────────────────────────────
function removeInput(canvas) {
  if (!canvas || !_inputHandlers) return;
  canvas.removeEventListener('click', _inputHandlers.click);
  canvas.removeEventListener('touchstart', _inputHandlers.touchstart);
  canvas.removeEventListener('mousemove', _inputHandlers.mousemove);
  _inputHandlers = null;
}

function initInput(canvas) {
  if (_inputHandlers) return;

  function onTap(cx, cy) {
    if (!_gameRunning) return;
    AvalonAudio.resume();
    if (_isGameOver && _showPanel && _retryZone) {
      const rect = canvas.getBoundingClientRect();
      const lx = cx * (CANVAS_W / rect.width), ly = cy * (CANVAS_H / rect.height);
      const z = _retryZone;
      if (lx >= z.x && lx <= z.x + z.w && ly >= z.y && ly <= z.y + z.h) {
        AvalonAudio.click(); restartGame(); return;
      }
    }
    if (_isGameOver) return;
    _knight.movingRight = !_knight.movingRight;
    AvalonAudio.click();
  }
  function onMove(cx, cy) {
    if (!_gameRunning || !_isGameOver || !_showPanel || !_retryZone) return;
    const rect = canvas.getBoundingClientRect();
    const lx = cx * (CANVAS_W / rect.width), ly = cy * (CANVAS_H / rect.height);
    const z = _retryZone;
    _retryHover = lx >= z.x && lx <= z.x + z.w && ly >= z.y && ly <= z.y + z.h;
  }

  _inputHandlers = {
    click(e) {
      const r = canvas.getBoundingClientRect();
      onTap(e.clientX - r.left, e.clientY - r.top);
    },
    touchstart(e) {
      if (!_gameRunning) return;
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      const tc = e.changedTouches[0];
      onTap(tc.clientX - r.left, tc.clientY - r.top);
    },
    mousemove(e) {
      const r = canvas.getBoundingClientRect();
      onMove(e.clientX - r.left, e.clientY - r.top);
    },
  };
  canvas.addEventListener('click', _inputHandlers.click);
  canvas.addEventListener('touchstart', _inputHandlers.touchstart, { passive: false });
  canvas.addEventListener('mousemove', _inputHandlers.mousemove);
}

// ─── RESTART ───────────────────────────────────
function restartGame() {
  _knight = { x: 80, speed: INITIAL_KNIGHT_SPEED, movingRight: true, state: 'idle', stateTimer: 0 };
  _objects = []; _spawnTimer = INITIAL_SPAWN_DELAY; _spawnDelay = INITIAL_SPAWN_DELAY;
  _bombChance = 0.30; _combo = 0; _score = 0;
  _isGameOver = false; _hasCelebrated = false; _showPanel = false;
  _scoreSubmitted = false;
  _isVictoryPaused = false; _confetti = []; _confettiBurstTimer = 0;
  _retryZone = null; _retryHover = false;
  _particles = []; _ftexts = []; _shakeDur = 0;
  _knightAnim.hitStartTs = 0;
  if (typeof updateHUD === 'function') updateHUD(0);
}

// ─── PUBLIC API ────────────────────────────────
const AvalonGame = {
  preload() {
    return new Promise(resolve => {
      if (_bgImage && _bgImage.complete && _bgImage.naturalWidth) { resolve(); return; }
      _bgImage = new Image();
      _bgImage.onload = () => resolve();
      _bgImage.onerror = () => resolve(); // fallback se manca
      _bgImage.src = 'assets/game/bg.webp';
    });
  },
  start(playerName) {
    _playerName = playerName;
    _resumeAfterPageShow = false;
    AvalonAudio.resume();
    AvalonAudio.unlock();
    if (_animFrame) { cancelAnimationFrame(_animFrame); _animFrame = null; }

    const container = document.getElementById('game-container');
    if (!_canvas) {
      _canvas = document.createElement('canvas');
      _canvas.width = CANVAS_W; _canvas.height = CANVAS_H;
      _canvas.style.display = 'block';
      container.appendChild(_canvas);
      initInput(_canvas);
    }
    _ctx = _canvas.getContext('2d');

    // Background image may already be loaded via preload(); fallback if not
    if (!_bgImage) {
      _bgImage = new Image();
      _bgImage.src = 'assets/game/bg.webp';
    }

    // Initialize animated bg elements
    _clouds = genCloudsV2();
    _leaves = genLeavesV2();
    _birds = [];
    _birdSpawnTimer = 3;
    _smokePuffs = [];
    _smokeTimer = 0;

    restartGame();

    // Hint on first play per session
    if (!sessionStorage.getItem('avalonHintShown')) {
      sessionStorage.setItem('avalonHintShown', '1');
      _showHint = true; _hintTimer = 3.5;
    }

    _gameRunning = true;
    _lastTs = performance.now(); _startTs = _lastTs;
    _animFrame = requestAnimationFrame(gameLoop);
  },
  resumeAfterVictory() {
    _isVictoryPaused = false;
  },
  endAfterVictory() {
    _isVictoryPaused = false;
    _isGameOver = true;
    _showPanel = true;
    finalizeScore();
  },
  isRunning() {
    return _gameRunning;
  },
  /** Stop immediato prima di lasciare la pagina (loop + audio). */
  stopForNavigation() {
    _resumeAfterPageShow = false;
    _gameRunning = false;
    if (_animFrame) {
      cancelAnimationFrame(_animFrame);
      _animFrame = null;
    }
    if (_gameOverPanelTimer) {
      clearTimeout(_gameOverPanelTimer);
      _gameOverPanelTimer = null;
    }
    AvalonAudio.teardown();
  },
  destroy() {
    _resumeAfterPageShow = false;
    _gameRunning = false;
    if (_animFrame) {
      cancelAnimationFrame(_animFrame);
      _animFrame = null;
    }
    if (_gameOverPanelTimer) {
      clearTimeout(_gameOverPanelTimer);
      _gameOverPanelTimer = null;
    }
    if (_canvas) removeInput(_canvas);
    AvalonAudio.teardown();
    _objects = [];
    _particles = [];
    _ftexts = [];
    _confetti = [];
    _birds = [];
    _smokePuffs = [];
  },
};

window.addEventListener('pagehide', (e) => {
  _resumeAfterPageShow = _gameRunning;
  if (e.persisted) pauseGame();
  else AvalonGame.destroy();
});

window.addEventListener('pageshow', (e) => {
  if (e.persisted && _resumeAfterPageShow) resumePausedGame();
});
