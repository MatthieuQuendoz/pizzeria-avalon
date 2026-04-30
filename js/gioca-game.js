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
  let ctx = null, enabled = true;
  function getCtx() {
    if (!ctx && typeof AudioContext !== 'undefined')
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { }
    return ctx;
  }
  function resume() { const c = getCtx(); if (c && c.state === 'suspended') c.resume(); }
  function tone(freq, dur, type = 'sine', vol = 0.08) {
    const c = getCtx(); if (!c || !enabled) return;
    try {
      const osc = c.createOscillator(), gain = c.createGain();
      osc.type = type; osc.frequency.value = freq;
      osc.connect(gain); gain.connect(c.destination);
      gain.gain.setValueAtTime(vol, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      osc.start(); osc.stop(c.currentTime + dur);
    } catch (_) { }
  }
  function noise(dur = 0.4, vol = 0.25) {
    const c = getCtx(); if (!c || !enabled) return;
    try {
      const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
      const src = c.createBufferSource(), gain = c.createGain();
      gain.gain.value = vol; src.buffer = buf;
      src.connect(gain); gain.connect(c.destination); src.start();
    } catch (_) { }
  }
  return {
    resume, setEnabled(v) { enabled = v; },
    pizza() { tone(880, 0.08, 'triangle', 0.08); setTimeout(() => tone(1320, 0.08, 'triangle', 0.08), 50); },
    combo(l) { tone(700 + l * 120, 0.12, 'square', 0.06); },
    bomb() { noise(0.45, 0.3); tone(120, 0.35, 'sawtooth', 0.15); },
    click() { tone(520, 0.05, 'square', 0.04); },
    win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'triangle', 0.08), i * 90)); },
  };
})();

// ─── COLOUR HELPERS ────────────────────────────
function lerpRGB(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}
function rgb(c) { return `rgb(${c[0]},${c[1]},${c[2]})`; }
function rgba(c, a) { return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }

// ─── SKY PALETTE (dawn / day / dusk / night) ───
const SKY = [
  { top: [26, 5, 51], bot: [255, 154, 139] },  // 0 dawn
  { top: [135, 206, 235], bot: [224, 244, 255] },  // 1 day
  { top: [255, 107, 53], bot: [74, 25, 66] },   // 2 dusk
  { top: [10, 10, 46], bot: [26, 26, 78] },   // 3 night
];
function getSkyColors(cycleT) {
  const idx = Math.floor(cycleT * 4) % 4;
  const nxt = (idx + 1) % 4;
  const t = (cycleT * 4) % 1;
  const s = t * t * (3 - 2 * t); // smoothstep
  return { top: lerpRGB(SKY[idx].top, SKY[nxt].top, s), bot: lerpRGB(SKY[idx].bot, SKY[nxt].bot, s) };
}

// ─── PRE-RENDER: MOON ──────────────────────────
let _moonCanvas = null;
function buildMoonCanvas() {
  const mc = document.createElement('canvas');
  mc.width = mc.height = 130;
  const cx = mc.getContext('2d');

  // Glow
  const grd = cx.createRadialGradient(65, 65, 8, 65, 65, 58);
  grd.addColorStop(0, 'rgba(180,210,255,0.55)');
  grd.addColorStop(0.5, 'rgba(180,210,255,0.2)');
  grd.addColorStop(1, 'rgba(180,210,255,0)');
  cx.fillStyle = grd; cx.beginPath(); cx.arc(65, 65, 58, 0, Math.PI * 2); cx.fill();

  // Full ivory circle
  cx.fillStyle = '#F8F4DC'; cx.beginPath(); cx.arc(65, 65, 28, 0, Math.PI * 2); cx.fill();

  // Crescent cut
  cx.globalCompositeOperation = 'destination-out';
  cx.fillStyle = 'rgba(0,0,0,1)'; cx.beginPath(); cx.arc(79, 59, 24, 0, Math.PI * 2); cx.fill();

  // Craters
  cx.globalCompositeOperation = 'source-atop';
  cx.fillStyle = 'rgba(160,150,120,0.28)';
  [[54, 68, 4], [49, 57, 2.5], [62, 76, 3.2]].forEach(([x, y, r]) => {
    cx.beginPath(); cx.arc(x, y, r, 0, Math.PI * 2); cx.fill();
  });

  return mc;
}

// ─── PRE-RENDER: CASTLE ────────────────────────
let _castleCanvas = null;
const CASTLE_W = 280, CASTLE_H = 200;
function buildCastleCanvas() {
  const cc = document.createElement('canvas');
  cc.width = CASTLE_W; cc.height = CASTLE_H;
  const cx = cc.getContext('2d');

  function stones(x, y, w, h, rowOff) {
    const sh = 14, sw = 24;
    for (let row = 0; row <= Math.ceil(h / sh) + 1; row++) {
      const off = ((row + (rowOff || 0)) % 2 === 0) ? 0 : sw / 2;
      for (let col = 0; col <= Math.ceil(w / sw) + 1; col++) {
        const sx = x + col * sw - off, sy = y + row * sh;
        const cx2 = Math.max(sx, x), cy2 = Math.max(sy, y);
        const sw2 = Math.min(sx + sw, x + w) - cx2, sh2 = Math.min(sy + sh, y + h) - cy2;
        if (sw2 <= 0 || sh2 <= 0) continue;
        cx.fillStyle = '#7C7870'; cx.fillRect(cx2 + 1, cy2 + 1, sw2 - 2, sh2 - 2);
        cx.strokeStyle = 'rgba(0,0,0,0.3)'; cx.lineWidth = 1; cx.strokeRect(cx2 + 0.5, cy2 + 0.5, sw2 - 1, sh2 - 1);
      }
    }
  }

  function tower(tx, ty, tw, th) {
    cx.fillStyle = '#68625C'; cx.fillRect(tx, ty, tw, th);
    stones(tx, ty, tw, th, 0);
    // Battlements
    const mw = 11, mg = 9;
    for (let mx = tx; mx < tx + tw; mx += mw + mg) {
      cx.fillStyle = '#5A5450'; cx.fillRect(mx, ty - 16, mw, 16);
      stones(mx, ty - 16, mw, 16, 1);
    }
    // Arrow slit
    cx.fillStyle = '#18100C';
    cx.fillRect(tx + tw / 2 - 3, ty + th * 0.22, 6, 22);
    cx.fillRect(tx + tw / 2 - 8, ty + th * 0.22 + 7, 16, 8);
    // Round window
    cx.beginPath(); cx.arc(tx + tw / 2, ty + th * 0.62, 5, Math.PI, 0); cx.fill();
    cx.fillRect(tx + tw / 2 - 5, ty + th * 0.62, 10, 8);
  }

  // Hill
  cx.fillStyle = '#527030'; cx.beginPath();
  cx.ellipse(CASTLE_W / 2, CASTLE_H + 12, 132, 56, 0, Math.PI, Math.PI * 2); cx.fill();

  // Wall
  const wy = CASTLE_H - 118, wh = 118;
  cx.fillStyle = '#68625C'; cx.fillRect(62, wy, CASTLE_W - 124, wh);
  stones(62, wy, CASTLE_W - 124, wh, 0);

  // Gate
  const gx = CASTLE_W / 2 - 22, gw = 44, gy = wy + wh - 68;
  cx.fillStyle = '#504A46'; cx.fillRect(gx - 4, gy, gw + 8, 80);
  cx.fillStyle = '#100A08'; cx.fillRect(gx, gy + 12, gw, 60);
  cx.beginPath(); cx.arc(CASTLE_W / 2, gy + 12, gw / 2, Math.PI, 0); cx.fill();
  // Arch trim
  cx.strokeStyle = '#504A46'; cx.lineWidth = 4;
  cx.beginPath(); cx.arc(CASTLE_W / 2, gy + 12, gw / 2 + 2, Math.PI, 0); cx.stroke();
  // Portcullis bars
  cx.strokeStyle = '#281E14'; cx.lineWidth = 2;
  for (let b = 0; b < 3; b++) {
    cx.beginPath(); cx.moveTo(gx + 8 + b * 14, gy + 12); cx.lineTo(gx + 8 + b * 14, gy + 72); cx.stroke();
  }
  [gy + 32, gy + 52].forEach(barY => {
    cx.beginPath(); cx.moveTo(gx, barY); cx.lineTo(gx + gw, barY); cx.stroke();
  });

  // Wall battlements
  const mw = 11, mg = 9;
  for (let mx = 66; mx < CASTLE_W - 58; mx += mw + mg) {
    cx.fillStyle = '#5A5450'; cx.fillRect(mx, wy - 14, mw, 14);
    stones(mx, wy - 14, mw, 14, 1);
  }

  // Towers (drawn last = on top)
  tower(4, wy - 80, 56, CASTLE_H - wy + 80);
  tower(CASTLE_W - 60, wy - 80, 56, CASTLE_H - wy + 80);

  return cc;
}

// ─── SCENE GENERATION ──────────────────────────
function genStars() {
  return Array.from({ length: 46 }, () => ({
    x: Math.random() * CANVAS_W, y: Math.random() * GROUND_Y * 0.72,
    r: Math.random() * 1.5 + 0.4,
    phase: Math.random() * Math.PI * 2, freq: 1 + Math.random() * 3.5,
  }));
}
function genClouds() {
  return [
    { baseX: 50, y: 58, scale: 1.25, speed: 20, blobs: [[-22, 0, 30], [0, -10, 25], [24, 4, 23], [-6, 10, 20], [28, 14, 18]] },
    { baseX: 290, y: 118, scale: 0.88, speed: 13, blobs: [[-15, 0, 22], [1, -7, 18], [18, 4, 15], [-4, 8, 14]] },
    { baseX: 170, y: 82, scale: 1.05, speed: 16, blobs: [[-18, 0, 26], [4, -8, 22], [21, 4, 19], [0, 10, 17], [23, 12, 14]] },
    { baseX: 390, y: 44, scale: 0.68, speed: 8, blobs: [[-12, 0, 18], [3, -5, 15], [14, 4, 12]] },
  ];
}
function genFlowers() {
  const cols = ['#FF6B6B', '#FFE66D', '#FFFFFF', '#FF9A8B', '#A8E6CF', '#FFB347'];
  return Array.from({ length: 22 }, (_, i) => ({
    x: 10 + i * (CANVAS_W / 21) + (Math.random() - 0.5) * 8,
    y: GROUND_Y + 4 + Math.random() * 9,
    color: cols[Math.floor(Math.random() * cols.length)],
    sz: 2 + Math.random() * 1.5,
  }));
}
function genBirds() {
  return [
    { baseX: 80, y: 148, speed: 22, flapSpeed: 8.5, phase: 0 },
    { baseX: 210, y: 128, speed: 18, flapSpeed: 9.2, phase: 1.6 },
    { baseX: 330, y: 162, speed: 26, flapSpeed: 7.8, phase: 3.1 },
  ];
}

// ─── DRAW: BACKGROUND ──────────────────────────
function drawBackground(ctx, t) {
  const cycleT = (t % DAY_CYCLE_MS) / DAY_CYCLE_MS;
  const sky = getSkyColors(cycleT);

  // Sky gradient
  const sg = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sg.addColorStop(0, rgb(sky.top)); sg.addColorStop(1, rgb(sky.bot));
  ctx.fillStyle = sg; ctx.fillRect(0, 0, CANVAS_W, GROUND_Y + 10);

  // Stars (night + edges of dawn)
  const nightStr = cycleT >= 0.75 ? (cycleT - 0.75) / 0.25 : cycleT < 0.1 ? (0.1 - cycleT) / 0.1 * 0.9 : 0;
  if (nightStr > 0.01) drawStars(ctx, t, nightStr);

  // Moon
  const moonVis = cycleT >= 0.75 ? (cycleT - 0.75) / 0.25 : 0;
  if (moonVis > 0.01) drawMoon(ctx, moonVis, t);

  // Sun
  const sunVis = (cycleT >= 0.22 && cycleT <= 0.78)
    ? Math.min(1, Math.min((cycleT - 0.22) / 0.07, (0.78 - cycleT) / 0.07)) : 0;
  if (sunVis > 0.01) drawSun(ctx, cycleT, sunVis, t);

  // Clouds
  const cloudA = cycleT >= 0.75 ? Math.max(0, 1 - (cycleT - 0.75) / 0.15)
    : cycleT < 0.1 ? 0.5
      : Math.min(1, Math.min((cycleT - 0.1) / 0.1, 1));
  if (cloudA > 0.01) drawClouds(ctx, t, cloudA);

  // Birds
  if (cycleT >= 0.3 && cycleT <= 0.7) {
    const ba = Math.min(1, Math.min((cycleT - 0.3) / 0.05, (0.7 - cycleT) / 0.05));
    drawBirds(ctx, t, ba);
  }

  // Mountains
  drawMountains(ctx, cycleT);
  // Castle
  if (_castleCanvas) {
    ctx.drawImage(_castleCanvas, (CANVAS_W - CASTLE_W) / 2, GROUND_Y - CASTLE_H + 22);
  }
  drawTrees(ctx);
  drawGround(ctx);
}

function drawStars(ctx, t, alpha) {
  const ts = t * 0.001;
  ctx.save(); ctx.globalAlpha = alpha;
  _stars.forEach(s => {
    const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(ts * s.freq + s.phase));
    ctx.fillStyle = `rgba(255,255,255,${tw})`;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();
}

function drawMoon(ctx, alpha, t) {
  if (!_moonCanvas) return;
  const ph = ((t % DAY_CYCLE_MS) / DAY_CYCLE_MS - 0.75 + 1) % 1 / 0.25;
  const mx = CANVAS_W * 0.1 + ph * CANVAS_W * 0.5;
  const my = 80 - Math.sin(ph * Math.PI) * 32;
  ctx.save(); ctx.globalAlpha = Math.min(1, alpha * 1.4);
  ctx.drawImage(_moonCanvas, mx - 65, my - 65);
  ctx.restore();
}

function drawSun(ctx, cycleT, alpha, t) {
  const ph = (cycleT - 0.22) / 0.56;
  const sx = ph * CANVAS_W;
  const sy = 95 - Math.sin(ph * Math.PI) * 58;
  const ts = t * 0.001;

  ctx.save(); ctx.globalAlpha = alpha;

  // Glow
  const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, 72);
  grd.addColorStop(0, 'rgba(255,230,120,0.65)');
  grd.addColorStop(0.35, 'rgba(255,200,80,0.3)');
  grd.addColorStop(1, 'rgba(255,160,60,0)');
  ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(sx, sy, 72, 0, Math.PI * 2); ctx.fill();

  // Rays
  ctx.strokeStyle = 'rgba(255,220,100,0.55)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + ts * 0.25;
    ctx.beginPath();
    ctx.moveTo(sx + Math.cos(a) * 30, sy + Math.sin(a) * 30);
    ctx.lineTo(sx + Math.cos(a) * 48, sy + Math.sin(a) * 48);
    ctx.stroke();
  }

  // Disc
  ctx.fillStyle = '#FFE040'; ctx.beginPath(); ctx.arc(sx, sy, 24, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#FFC020'; ctx.lineWidth = 2; ctx.stroke();

  // Face
  ctx.fillStyle = 'rgba(180,100,0,0.18)';
  ctx.beginPath(); ctx.arc(sx - 8, sy - 4, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(sx + 8, sy - 4, 3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(180,100,0,0.22)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(sx, sy + 2, 8, 0.2, Math.PI - 0.2); ctx.stroke();

  ctx.restore();
}

function drawClouds(ctx, t, alpha) {
  const elapsed = t * 0.001;
  ctx.save();
  _clouds.forEach(c => {
    const totalW = CANVAS_W + 220;
    const cx2 = ((c.baseX + elapsed * c.speed * c.scale * 0.8) % totalW + totalW) % totalW - 110;
    ctx.save(); ctx.translate(cx2, c.y); ctx.scale(c.scale, c.scale);
    // Shadow
    c.blobs.forEach(([bx, by, br]) => {
      ctx.fillStyle = `rgba(150,175,200,${0.22 * alpha})`;
      ctx.beginPath(); ctx.arc(bx + 5, by + 7, br, 0, Math.PI * 2); ctx.fill();
    });
    // Body
    c.blobs.forEach(([bx, by, br]) => {
      ctx.fillStyle = `rgba(255,255,255,${0.92 * alpha})`;
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  });
  ctx.restore();
}

function drawBirds(ctx, t, alpha) {
  const elapsed = t * 0.001;
  ctx.save(); ctx.globalAlpha = alpha;
  _birds.forEach(b => {
    const bx = (b.baseX + elapsed * b.speed) % (CANVAS_W + 60) - 30;
    const by = b.y + Math.sin(elapsed * 0.5 + b.phase) * 6;
    const flap = Math.sin(elapsed * b.flapSpeed + b.phase) * 0.7;
    ctx.strokeStyle = 'rgba(28,18,18,0.75)'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx - 13, by + flap * 8);
    ctx.quadraticCurveTo(bx - 4, by, bx, by);
    ctx.quadraticCurveTo(bx + 4, by, bx + 13, by + flap * 8);
    ctx.stroke();
  });
  ctx.restore();
}

function drawMountains(ctx, cycleT) {
  const night = cycleT >= 0.75 ? (cycleT - 0.75) / 0.25 : 0;
  const hills = [
    [CANVAS_W * 0.15, GROUND_Y - 22, CANVAS_W * 0.6, 82, 120, 130, 158],
    [CANVAS_W * 0.6, GROUND_Y - 12, CANVAS_W * 0.72, 100, 100, 110, 138],
    [CANVAS_W * 0.87, GROUND_Y - 6, CANVAS_W * 0.52, 72, 110, 120, 148],
  ];
  hills.forEach(([hx, hy, hw, hh, r, g, b]) => {
    const lr = Math.round(r - night * 60), lg = Math.round(g - night * 60), lb = Math.round(b - night * 50);
    ctx.fillStyle = `rgba(${lr},${lg},${lb},0.52)`;
    ctx.beginPath(); ctx.ellipse(hx, hy, hw / 2, hh, 0, Math.PI, Math.PI * 2); ctx.fill();
  });
}

function drawTrees(ctx) {
  const trees = [[18, GROUND_Y - 4, 0.62], [42, GROUND_Y - 7, 0.78], [322, GROUND_Y - 5, 0.7], [358, GROUND_Y - 4, 0.56], [384, GROUND_Y - 6, 0.64]];
  trees.forEach(([tx, ty, ts]) => {
    ctx.save(); ctx.translate(tx, ty); ctx.scale(ts, ts);
    ctx.fillStyle = '#5C4A2A'; ctx.fillRect(-4, -14, 8, 16);
    ctx.fillStyle = '#3A6B28'; ctx.beginPath(); ctx.arc(0, -24, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4A8038'; ctx.beginPath(); ctx.arc(-8, -17, 13, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(8, -19, 11, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });
}

function drawGround(ctx) {
  // Dirt
  ctx.fillStyle = '#8B6B47'; ctx.fillRect(0, GROUND_Y + 18, CANVAS_W, CANVAS_H - GROUND_Y - 18);

  // Grass edge (slightly uneven)
  ctx.fillStyle = '#4CAF50'; ctx.beginPath(); ctx.moveTo(0, GROUND_Y + 18);
  for (let x = 0; x <= CANVAS_W; x += 6) {
    ctx.lineTo(x, GROUND_Y + 6 + Math.sin(x * 0.28) * 3 + Math.sin(x * 0.65 + 1) * 2);
  }
  ctx.lineTo(CANVAS_W, GROUND_Y + 18); ctx.closePath(); ctx.fill();

  // Dark patches
  ctx.fillStyle = '#388E3C';
  for (let px = 12; px < CANVAS_W - 12; px += 38 + (px % 18)) {
    ctx.beginPath(); ctx.ellipse(px, GROUND_Y + 11, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
  }

  // Flowers
  _flowers.forEach(f => {
    ctx.strokeStyle = '#2E7D32'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(f.x, GROUND_Y + 16); ctx.lineTo(f.x, f.y); ctx.stroke();
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2;
      ctx.fillStyle = f.color;
      ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * 3.5, f.y + Math.sin(a) * 3.5, f.sz, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#FFEE58'; ctx.beginPath(); ctx.arc(f.x, f.y, 2, 0, Math.PI * 2); ctx.fill();
  });

  // Rocks
  [[62, GROUND_Y + 14, 5], [188, GROUND_Y + 16, 4], [312, GROUND_Y + 13, 6]].forEach(([rx, ry, rr]) => {
    ctx.fillStyle = '#9E9E9E'; ctx.beginPath(); ctx.ellipse(rx, ry, rr, rr * 0.6, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#BDBDBD'; ctx.beginPath(); ctx.ellipse(rx - rr * 0.2, ry - rr * 0.2, rr * 0.4, rr * 0.3, 0.5, 0, Math.PI * 2); ctx.fill();
  });
}

// ─── KNIGHT SPRITE ─────────────────────────────
const FRAME_W = 350, FRAME_H = 261;
const KNIGHT_DH = 90;
const KNIGHT_DW = KNIGHT_DH * FRAME_W / FRAME_H; // ≈ 134

const KNIGHT_FRAMES = [
  // ── run (0–5) ──
  { x: 0, y: 0 }, // 0
  { x: 350, y: 0 }, // 1
  { x: 700, y: 0 }, // 2
  { x: 1050, y: 0 }, // 3
  { x: 0, y: 261 }, // 4
  { x: 350, y: 261 }, // 5
  // ── attack (6–9) ──
  { x: 700, y: 261 }, // 6
  { x: 1050, y: 261 }, // 7
  { x: 0, y: 522 }, // 8
  { x: 350, y: 522 }, // 9
  // ── dead (10–14) ──
  { x: 700, y: 522 }, // 10
  { x: 1050, y: 522 }, // 11
  { x: 0, y: 783 }, // 12
  { x: 350, y: 783 }, // 13
  { x: 700, y: 783 }, // 14
];

const ANIM = {
  idle: { start: 0, count: 6, fps: 6, loop: true },
  run: { start: 0, count: 6, fps: 6, loop: true },
  catch: { start: 6, count: 4, fps: 12, loop: false },
  hit: { start: 10, count: 5, fps: 8, loop: false },
};

function drawKnight(ctx, x, state, t, facingRight) {
  if (!_spritesheetImg || !_spritesheetImg.complete) return;

  const anim = ANIM[state] || ANIM.run;
  const sec = t * 0.001;
  let localFrame;
  if (state === 'hit') {
    const elapsed = (t - _knightAnim.hitStartTs) * 0.001;
    localFrame = Math.min(Math.floor(elapsed * anim.fps), anim.count - 1);
  } else {
    localFrame = Math.floor(sec * anim.fps) % anim.count;
  }

  const frame = KNIGHT_FRAMES[anim.start + localFrame];
  const dw = KNIGHT_DW, dh = KNIGHT_DH;
  const dx = x - dw / 2;
  const dy = GROUND_Y - dh + (state === 'hit' ? dh * 0.55 : 0);

  ctx.save();
  // Flip orizzontale attorno al centro x del cavaliere
  if (!facingRight) ctx.transform(-1, 0, 0, 1, x * 2, 0);

  ctx.drawImage(_spritesheetImg, frame.x, frame.y, FRAME_W, FRAME_H, dx, dy, dw, dh);

  // Flash rosso durante hit
  if (state === 'hit' && Math.sin(t * 0.028) > 0) {
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#FF3030';
    ctx.beginPath();
    ctx.ellipse(x, dy + dh * 0.5, dw * 0.42, dh * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}


// ─── DRAW: PIZZA (3 variants) ──────────────────
function drawPizza(ctx, x, y, variant, rotation, glowing) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
  const r = 23;

  if (glowing) {
    const g = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 2.6);
    g.addColorStop(0, 'rgba(255,200,80,0.45)'); g.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 2.6, 0, Math.PI * 2); ctx.fill();
  }

  // Crust
  ctx.fillStyle = '#C8843A'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8B5A1A'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.strokeStyle = '#D9954A'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r - 2.5, 0, Math.PI * 2); ctx.stroke();

  const ir = r - 6;

  if (variant === 0) {
    // MARGHERITA
    ctx.fillStyle = '#E04030'; ctx.beginPath(); ctx.arc(0, 0, ir, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#F5EFE0';
    [[0, -8, 6], [8, 5, 5], [-7, 6, 5], [2, 10, 4], [-9, -2, 4]].forEach(([bx, by, br]) => {
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
    });
    [[-4, -2, 0.4], [6, -5, -0.5], [-6, 10, 0.8]].map(([lx, ly, la]) => {
      ctx.save(); ctx.translate(lx, ly); ctx.rotate(la);
      ctx.fillStyle = '#2E7D32'; ctx.beginPath(); ctx.ellipse(0, 0, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
  } else if (variant === 1) {
    // PEPPERONI
    ctx.fillStyle = '#D03828'; ctx.beginPath(); ctx.arc(0, 0, ir, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#F0EAD8';
    [[0, -5, 5], [8, 6, 4], [-7, 5, 4]].forEach(([bx, by, br]) => { ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill(); });
    [[-6, -8, 5], [7, -7, 5], [0, 6, 5], [-9, 3, 4.5], [9, 3, 4.5], [-1, -1, 4]].forEach(([px, py, pr]) => {
      ctx.fillStyle = '#7B1A0E'; ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#9B2A1A'; ctx.beginPath(); ctx.arc(px - 1, py - 1, pr * 0.5, 0, Math.PI * 2); ctx.fill();
    });
  } else {
    // QUATTRO FORMAGGI
    ctx.fillStyle = '#EDE0C0'; ctx.beginPath(); ctx.arc(0, 0, ir, 0, Math.PI * 2); ctx.fill();
    ['#F5D58A', '#E8C890', '#D4B870', '#F0DC98'].forEach((col, q) => {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.arc(0, 0, ir, q * Math.PI / 2 - 0.06, (q + 1) * Math.PI / 2 + 0.06); ctx.closePath(); ctx.fill();
    });
    ctx.strokeStyle = '#C09040'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, -ir); ctx.lineTo(0, ir); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-ir, 0); ctx.lineTo(ir, 0); ctx.stroke();
    ctx.fillStyle = 'rgba(180,140,60,0.35)';
    [[-6, -6, 3], [7, 6, 2.5], [-5, 7, 2.2], [7, -7, 2.5]].forEach(([bx, by, br]) => {
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
    });
  }

  // Inner edge outline
  ctx.strokeStyle = '#6B3A10'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, 0, ir, 0, Math.PI * 2); ctx.stroke();

  ctx.restore();
}

// ─── DRAW: BOMB ────────────────────────────────
function drawBomb(ctx, x, y, t) {
  ctx.save(); ctx.translate(x, y);
  const ts = t * 0.001;
  ctx.rotate(Math.sin(ts * 5.5) * 0.08);

  const r = 20, fx = 8, fy = -r - 20;

  // Fuse
  ctx.strokeStyle = '#7B5B30'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -r + 2); ctx.quadraticCurveTo(10, -r - 8, fx, fy); ctx.stroke();

  // Spark
  const pulse = 0.5 + 0.5 * Math.sin(ts * 30);
  const sr = 4 + pulse * 3;
  const sg = ctx.createRadialGradient(fx, fy, 0, fx, fy, sr * 2.6);
  sg.addColorStop(0, 'rgba(255,255,220,1)'); sg.addColorStop(0.2, '#FFD700');
  sg.addColorStop(0.6, 'rgba(255,107,53,0.8)'); sg.addColorStop(1, 'rgba(255,50,0,0)');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(fx, fy, sr * 2.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(fx, fy, 2, 0, Math.PI * 2); ctx.fill();

  // Cap
  ctx.fillStyle = '#4A3828'; ctx.beginPath(); ctx.ellipse(0, -r + 2, 8, 5, 0, 0, Math.PI * 2); ctx.fill();

  // Body
  const bg = ctx.createRadialGradient(-6, -6, 2, 0, 0, r);
  bg.addColorStop(0, '#4A4848'); bg.addColorStop(0.35, '#282424'); bg.addColorStop(1, '#0A0808');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#181414'; ctx.lineWidth = 2; ctx.stroke();

  // Specular
  ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.ellipse(-6, -7, 7, 5, -0.3, 0, Math.PI * 2); ctx.fill();

  // White cross
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.fillRect(-2, -r + 8, 4, r * 1.2 - 8);
  ctx.fillRect(-r + 4, -2, r * 2 - 8, 4);

  ctx.restore();
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
let _spritesheetImg = null;
let _knightAnim = { hitStartTs: 0 };
let _stars = [], _clouds = [], _flowers = [], _birds = [];
let _knight = { x: 80, speed: INITIAL_KNIGHT_SPEED, movingRight: true, state: 'idle', stateTimer: 0 };
let _objects = [], _spawnTimer = INITIAL_SPAWN_DELAY, _spawnDelay = INITIAL_SPAWN_DELAY, _bombChance = 0.30, _combo = 0;
let _score = 0, _isGameOver = false, _hasCelebrated = false, _showPanel = false;
let _isRecord = false, _prevBest = 0, _playerName = 'Giocatore';
let _particles = [], _ftexts = [];
let _retryZone = null, _retryHover = false;
let _shakeX = 0, _shakeY = 0, _shakeDur = 0;
let _hintTimer = 0, _showHint = false;

// ─── GAME LOOP ─────────────────────────────────
function gameLoop(ts) {
  _animFrame = requestAnimationFrame(gameLoop);
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

  drawBackground(_ctx, gameT);

  if (!_isGameOver) {
    updateKnight(dt);
    updateObjects(dt);

    // Falling objects (behind knight)
    _objects.forEach(obj => {
      const near = Math.abs(obj.x - _knight.x) < 90 && obj.y > GROUND_Y - KNIGHT_DH - 80;
      if (obj.type === 'pizza') drawPizza(_ctx, obj.x, obj.y, obj.variant, obj.rot, near);
      else drawBomb(_ctx, obj.x, obj.y, ts);
    });

    drawKnight(_ctx, _knight.x, _knight.state, ts, _knight.movingRight);

    updateAndDrawParticles(_ctx, dt);
    updateAndDrawTexts(_ctx, dt);

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
  _spawnDelay = Math.max(MIN_SPAWN_DELAY, _spawnDelay - 30);
  _knight.speed = Math.min(MAX_KNIGHT_SPEED, _knight.speed + 4);
  _bombChance = Math.min(0.5, _bombChance + 0.01);
  if (typeof updateHUD === 'function') updateHUD(_score);
  if (!_hasCelebrated && _score >= TARGET_SCORE) {
    _hasCelebrated = true; AvalonAudio.win();
    addText(CANVAS_W / 2, CANVAS_H / 2, '🎉 Premio sbloccato!', '#2E7D32', 24);
  }
}

// ─── HIT BOMB ──────────────────────────────────
function hitBomb(obj) {
  spawnBombParticles(obj.x, obj.y);
  _isGameOver = true; _shakeDur = 0.45;
  _knightAnim.hitStartTs = _lastTs;
  AvalonAudio.bomb();
  _objects.forEach(o => { o.vy = 0; o.vx = 0; o.vr = 0; });
  _knight.state = 'hit'; _knight.stateTimer = 9999;

  const pb = typeof getPlayerBest === 'function' ? getPlayerBest() : 0;
  _prevBest = pb; _isRecord = _score > pb;
  if (_isRecord && typeof savePlayerBest === 'function') savePlayerBest(_score);
  if (typeof leaderboardApi !== 'undefined')
    leaderboardApi.submitScore(_playerName, _score)
      .then(() => { if (typeof renderLeaderboard === 'function') renderLeaderboard(); });
  setTimeout(() => { _showPanel = true; }, 820);
}

// ─── INPUT ─────────────────────────────────────
function initInput(canvas) {
  function onTap(cx, cy) {
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
    if (!_isGameOver || !_showPanel || !_retryZone) return;
    const rect = canvas.getBoundingClientRect();
    const lx = cx * (CANVAS_W / rect.width), ly = cy * (CANVAS_H / rect.height);
    const z = _retryZone;
    _retryHover = lx >= z.x && lx <= z.x + z.w && ly >= z.y && ly <= z.y + z.h;
  }
  canvas.addEventListener('click', e => {
    const r = canvas.getBoundingClientRect(); onTap(e.clientX - r.left, e.clientY - r.top);
  });
  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect(), tc = e.changedTouches[0];
    onTap(tc.clientX - r.left, tc.clientY - r.top);
  }, { passive: false });
  canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect(); onMove(e.clientX - r.left, e.clientY - r.top);
  });
}

// ─── RESTART ───────────────────────────────────
function restartGame() {
  _knight = { x: 80, speed: INITIAL_KNIGHT_SPEED, movingRight: true, state: 'idle', stateTimer: 0 };
  _objects = []; _spawnTimer = INITIAL_SPAWN_DELAY; _spawnDelay = INITIAL_SPAWN_DELAY;
  _bombChance = 0.30; _combo = 0; _score = 0;
  _isGameOver = false; _hasCelebrated = false; _showPanel = false;
  _retryZone = null; _retryHover = false;
  _particles = []; _ftexts = []; _shakeDur = 0;
  _knightAnim.hitStartTs = 0;
  if (typeof updateHUD === 'function') updateHUD(0);
}

// ─── PUBLIC API ────────────────────────────────
const AvalonGame = {
  start(playerName) {
    _playerName = playerName;
    AvalonAudio.resume();
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

    // Build pre-rendered assets
    _moonCanvas = buildMoonCanvas();
    _castleCanvas = buildCastleCanvas();

    // Generate scene elements
    _stars = genStars(); _clouds = genClouds(); _flowers = genFlowers(); _birds = genBirds();

    restartGame();

    // Hint on first play per session
    if (!sessionStorage.getItem('avalonHintShown')) {
      sessionStorage.setItem('avalonHintShown', '1');
      _showHint = true; _hintTimer = 3.5;
    }

    // Carica spritesheet; avvia il loop solo dopo il load
    const startLoop = () => {
      _lastTs = performance.now(); _startTs = _lastTs;
      _animFrame = requestAnimationFrame(gameLoop);
    };
    if (_spritesheetImg && _spritesheetImg.complete) {
      startLoop();
    } else {
      const img = new Image();
      img.onload = () => { _spritesheetImg = img; startLoop(); };
      img.onerror = () => { _spritesheetImg = null; startLoop(); }; // gioca anche senza sprite
      img.src = 'assets/game/spritesheet.png';
    }
  },
};
