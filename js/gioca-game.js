/* ============================================
   PIZZERIA AVALON — L'Acchiappa Pizze (Phaser)
   Asset placeholder generati a runtime tramite
   Graphics.generateTexture — pronti da sostituire
   con gli asset ufficiali in assets/game/.
   ============================================ */

const GAME_WIDTH = 440;
const GAME_HEIGHT = 580;

const INITIAL_SPAWN_DELAY = 1500;
const MIN_SPAWN_DELAY = 380;
const INITIAL_KNIGHT_SPEED = 190;
const MAX_KNIGHT_SPEED = 440;
const FALL_SPEED = 230;

const COLORS = {
  red: 0xB12C16,
  redLight: 0xD64A32,
  brown: 0x2D1D1D,
  brownLight: 0x5A413C,
  crema: 0xFDF6EE,
  sky1: 0xF4D79A,
  sky2: 0xE8A970,
  ground: 0x8B6B47,
  grass: 0x6B8E3D,
  stone: 0x8A7A68,
  stoneDark: 0x5E4F3E,
};

// ---------- Audio (Web Audio API, no file esterni) ----------
const AvalonAudio = (() => {
  let ctx = null;
  let enabled = true;

  function getCtx() {
    if (!ctx && typeof AudioContext !== 'undefined') {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {}
    }
    return ctx;
  }

  function resume() {
    const c = getCtx();
    if (c && c.state === 'suspended') c.resume();
  }

  function tone(freq, duration, type = 'sine', volume = 0.08) {
    const c = getCtx();
    if (!c || !enabled) return;
    try {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      osc.connect(gain); gain.connect(c.destination);
      gain.gain.setValueAtTime(volume, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
      osc.start();
      osc.stop(c.currentTime + duration);
    } catch (_) {}
  }

  function noise(duration = 0.4, volume = 0.25) {
    const c = getCtx();
    if (!c || !enabled) return;
    try {
      const buf = c.createBuffer(1, c.sampleRate * duration, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
      }
      const src = c.createBufferSource();
      const gain = c.createGain();
      gain.gain.value = volume;
      src.buffer = buf;
      src.connect(gain); gain.connect(c.destination);
      src.start();
    } catch (_) {}
  }

  return {
    resume,
    setEnabled(v) { enabled = v; },
    pizza() { tone(880, 0.08, 'triangle', 0.08); setTimeout(() => tone(1320, 0.08, 'triangle', 0.08), 50); },
    combo(level) { tone(700 + level * 120, 0.12, 'square', 0.06); },
    bomb() { noise(0.45, 0.3); tone(120, 0.35, 'sawtooth', 0.15); },
    click() { tone(520, 0.05, 'square', 0.04); },
    win() {
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'triangle', 0.08), i * 90));
    },
  };
})();

// ---------- Generazione texture placeholder ----------
function buildTextures(scene) {
  // PIZZA (48x48)
  const pg = scene.add.graphics();
  pg.fillStyle(0xD9A05C, 1); pg.fillCircle(24, 24, 22);       // crosta
  pg.fillStyle(0xF2C878, 1); pg.fillCircle(24, 24, 19);       // pasta
  pg.fillStyle(0xE85C42, 1); pg.fillCircle(24, 24, 15);       // salsa
  pg.fillStyle(0xF8E4A0, 0.9);                                 // mozzarella
  [[19,19,4],[30,22,3],[22,30,3],[29,29,3]].forEach(([x,y,r]) => pg.fillCircle(x, y, r));
  pg.fillStyle(0x7A1E14, 1);                                   // pepperoni
  [[18,16,2.5],[30,17,2.5],[16,28,2.5],[31,31,2.5],[24,24,2.5]].forEach(([x,y,r]) => pg.fillCircle(x, y, r));
  pg.fillStyle(0x3B5E2E, 1);                                   // basilico
  [[20,25,1.8],[28,20,1.8]].forEach(([x,y,r]) => pg.fillCircle(x, y, r));
  pg.generateTexture('pizza', 48, 48); pg.destroy();

  // BOMBA (48x52)
  const bg = scene.add.graphics();
  bg.fillStyle(0x1A1212, 1); bg.fillCircle(24, 30, 18);       // corpo
  bg.fillStyle(0x3A2A2A, 1); bg.fillCircle(19, 25, 5);        // riflesso
  bg.fillStyle(0xFFFFFF, 0.35); bg.fillCircle(18, 24, 2.2);   // highlight
  bg.fillStyle(0x4A3526, 1); bg.fillRect(21, 10, 6, 5);        // tappo
  bg.lineStyle(2, 0x8B6B47, 1);                                // miccia
  bg.beginPath(); bg.moveTo(24, 10); bg.lineTo(30, 2); bg.strokePath();
  bg.fillStyle(0xFFD700, 1); bg.fillCircle(30, 2, 4);          // scintilla gialla
  bg.fillStyle(0xFF6B35, 1); bg.fillCircle(30, 2, 2.5);        // scintilla arancio
  bg.fillStyle(0xFFFFFF, 1); bg.fillCircle(30, 2, 1);          // core scintilla
  bg.generateTexture('bomb', 48, 52); bg.destroy();

  // CAVALIERE (52x62)
  const kg = scene.add.graphics();
  // scudo
  kg.fillStyle(0xB12C16, 1);
  kg.fillRoundedRect(2, 22, 16, 22, 3);
  kg.fillStyle(0xFFFFFF, 1);
  kg.fillRect(8, 28, 2, 10); kg.fillRect(5, 32, 8, 2);  // croce bianca
  // corpo armatura
  kg.fillStyle(0xB0B0B0, 1);
  kg.fillRoundedRect(18, 24, 22, 28, 4);
  kg.fillStyle(0x909090, 1);
  kg.fillRect(18, 36, 22, 2);
  // elmo
  kg.fillStyle(0x9A9A9A, 1);
  kg.fillRoundedRect(20, 8, 18, 20, 4);
  kg.fillStyle(0x1A1212, 1);
  kg.fillRect(22, 15, 14, 3);  // visiera
  // pennacchio
  kg.fillStyle(0xB12C16, 1);
  kg.fillTriangle(29, 0, 34, 8, 24, 8);
  // spada
  kg.fillStyle(0xE0E0E0, 1);
  kg.fillRect(42, 14, 4, 30);
  kg.fillStyle(0x8B6B47, 1);
  kg.fillRect(40, 42, 8, 4);
  kg.fillStyle(0xFFD700, 1);
  kg.fillRect(43, 10, 2, 6);
  // gambe
  kg.fillStyle(0x5A413C, 1);
  kg.fillRect(22, 52, 6, 10);
  kg.fillRect(32, 52, 6, 10);
  kg.generateTexture('knight', 52, 62); kg.destroy();

  // CASTELLO (platform) (440x110)
  const cg = scene.add.graphics();
  cg.fillStyle(0x6B5442, 1);
  cg.fillRect(0, 30, 440, 80);
  // pietre
  cg.fillStyle(0x8A7A68, 1);
  for (let r = 0; r < 2; r++) {
    for (let x = 0; x < 440; x += 44) {
      const offset = r % 2 === 0 ? 0 : 22;
      cg.fillRoundedRect(x + offset, 40 + r * 30, 40, 26, 2);
    }
  }
  // merli
  cg.fillStyle(0x5E4F3E, 1);
  for (let x = 0; x < 440; x += 40) {
    cg.fillRect(x, 15, 20, 15);
    cg.fillRect(x, 0, 20, 18);
  }
  // linee pietra scure
  cg.lineStyle(1, 0x3A2A22, 0.4);
  for (let r = 0; r < 2; r++) {
    for (let x = 0; x < 440; x += 44) {
      const offset = r % 2 === 0 ? 0 : 22;
      cg.strokeRect(x + offset, 40 + r * 30, 40, 26);
    }
  }
  cg.generateTexture('castle', 440, 110); cg.destroy();

  // PARTICELLA (8x8)
  const partG = scene.add.graphics();
  partG.fillStyle(0xFFFFFF, 1);
  partG.fillCircle(4, 4, 4);
  partG.generateTexture('particle', 8, 8); partG.destroy();

  // NUVOLA (semplice)
  const cloudG = scene.add.graphics();
  cloudG.fillStyle(0xFFFFFF, 0.9);
  cloudG.fillCircle(16, 16, 14);
  cloudG.fillCircle(30, 14, 12);
  cloudG.fillCircle(44, 18, 10);
  cloudG.fillCircle(26, 22, 13);
  cloudG.generateTexture('cloud', 60, 36); cloudG.destroy();
}

// ---------- Scene principale ----------
class AvalonGameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AvalonGameScene' });
  }

  init(data) {
    // Al primo boot data è {}, i restart passano { playerName }
    this.playerName = (data && data.playerName) || _pendingPlayerName;
    this.score = 0;
    this.combo = 0;
    this.knightSpeed = INITIAL_KNIGHT_SPEED;
    this.movingRight = true;
    this.spawnDelay = INITIAL_SPAWN_DELAY;
    this.isGameOver = false;
    this.hasCelebratedTarget = false;
    this.bombChance = 0.30;
  }

  create() {
    buildTextures(this);
    this.drawBackground();
    this.spawnClouds();

    // Castello (piattaforma)
    this.castle = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT - 55, 'castle').setDepth(5);

    // Cavaliere
    this.knight = this.physics.add.sprite(80, GAME_HEIGHT - 150, 'knight').setDepth(6);
    this.knight.body.allowGravity = false;
    this.knight.setCollideWorldBounds(true);
    this.knight.body.setCircle(20, 6, 14);

    // Gruppo oggetti
    this.fallingObjects = this.physics.add.group();
    this.physics.add.overlap(this.knight, this.fallingObjects, this.handleCollision, null, this);

    // Linea di distruzione (all'altezza della piattaforma)
    this.destroyLine = GAME_HEIGHT - 120;

    // Timer spawn
    this.startSpawning();

    // Input tap
    this.input.on('pointerdown', this.onTap, this);

    // Hint breve solo la prima partita
    if (!this.registry.get('hintShown')) {
      this.showHint();
      this.registry.set('hintShown', true);
    }

    // Piccolo "pop" all'apparizione del cavaliere
    this.tweens.add({
      targets: this.knight,
      scale: { from: 0.6, to: 1 },
      duration: 300,
      ease: 'Back.easeOut',
    });
  }

  drawBackground() {
    // Cielo gradiente (due strisce + rettangolo)
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 4, GAME_WIDTH, GAME_HEIGHT / 2, COLORS.sky1);
    const skyFade = this.add.graphics();
    skyFade.fillGradientStyle(COLORS.sky1, COLORS.sky1, COLORS.sky2, COLORS.sky2, 1);
    skyFade.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT - 110);

    // Terra
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 55, GAME_WIDTH, 110, COLORS.ground);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 108, GAME_WIDTH, 6, COLORS.grass);

    // Colline distanti
    const hill = this.add.graphics();
    hill.fillStyle(0x8E6F4B, 1);
    hill.fillEllipse(80, GAME_HEIGHT - 120, 220, 60);
    hill.fillEllipse(380, GAME_HEIGHT - 130, 260, 80);

    // Sole
    const sun = this.add.graphics();
    sun.fillStyle(0xFFE8A0, 0.8);
    sun.fillCircle(GAME_WIDTH - 60, 80, 28);
    sun.fillStyle(0xFFD770, 1);
    sun.fillCircle(GAME_WIDTH - 60, 80, 22);
  }

  spawnClouds() {
    for (let i = 0; i < 3; i++) {
      const cloud = this.add.image(
        Phaser.Math.Between(0, GAME_WIDTH),
        Phaser.Math.Between(40, 140),
        'cloud'
      ).setAlpha(0.9).setScale(Phaser.Math.FloatBetween(0.7, 1.1));
      this.tweens.add({
        targets: cloud,
        x: cloud.x + GAME_WIDTH,
        duration: Phaser.Math.Between(30000, 50000),
        repeat: -1,
        onRepeat: () => { cloud.x = -80; },
      });
    }
  }

  showHint() {
    const hint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40,
      'Tocca per cambiare direzione!',
      {
        fontSize: '18px',
        fontFamily: 'Aleo, serif',
        color: '#FFFFFF',
        backgroundColor: '#B12C16',
        padding: { x: 14, y: 8 },
        align: 'center',
      }
    ).setOrigin(0.5).setDepth(20);

    this.tweens.add({
      targets: hint,
      alpha: 0.6,
      duration: 700,
      yoyo: true,
      repeat: 3,
    });
    this.time.delayedCall(3500, () => {
      this.tweens.add({
        targets: hint,
        alpha: 0,
        y: hint.y - 20,
        duration: 400,
        onComplete: () => hint.destroy(),
      });
    });
  }

  startSpawning() {
    if (this.spawnTimer) this.spawnTimer.remove();
    this.spawnTimer = this.time.addEvent({
      delay: this.spawnDelay,
      callback: this.spawnObject,
      callbackScope: this,
      loop: true,
    });
  }

  spawnObject() {
    if (this.isGameOver) return;
    const type = Math.random() < this.bombChance ? 'bomb' : 'pizza';
    const x = Phaser.Math.Between(40, GAME_WIDTH - 40);
    // y=1 → dentro i world bounds, niente blocco da setCollideWorldBounds
    const obj = this.fallingObjects.create(x, 1, type);
    obj.setDepth(7);
    obj.setScale(0.9);
    obj.setVelocityY(FALL_SPEED);
    obj.setVelocityX(Phaser.Math.Between(-40, 40));
    obj.setAngularVelocity(Phaser.Math.Between(-120, 120));
    obj.body.allowGravity = false;
    // NON usare setCollideWorldBounds: il rimbalzo sinistro/destro
    // è gestito manualmente in update() per evitare il blocco in cima
    if (type === 'pizza') {
      obj.body.setCircle(18, 6, 6);
    } else {
      obj.body.setCircle(15, 9, 12);
    }
    obj.setData('type', type);
  }

  onTap() {
    AvalonAudio.resume();
    if (this.isGameOver) return;
    this.movingRight = !this.movingRight;
    AvalonAudio.click();
    // piccola rotazione feedback
    this.tweens.add({
      targets: this.knight,
      angle: this.movingRight ? 5 : -5,
      duration: 100,
      yoyo: true,
    });
  }

  handleCollision(knight, object) {
    const type = object.getData('type');
    if (type === 'pizza') this.catchPizza(object);
    else if (type === 'bomb') this.hitBomb(object);
  }

  catchPizza(object) {
    const x = object.x, y = object.y;
    object.destroy();

    this.score += 1;
    this.combo += 1;

    AvalonAudio.pizza();
    this.emitPizzaParticles(x, y);
    this.showFloatingScore(x, y, '+1', '#3F6833');

    if (this.combo >= 3) {
      AvalonAudio.combo(Math.min(this.combo - 2, 5));
      this.showComboLabel(this.combo);
    }

    // Aumenta difficoltà
    this.spawnDelay = Math.max(MIN_SPAWN_DELAY, this.spawnDelay - 60);
    this.knightSpeed = Math.min(MAX_KNIGHT_SPEED, this.knightSpeed + 8);
    this.bombChance = Math.min(0.5, this.bombChance + 0.01);
    this.startSpawning();

    // HUD esterno
    if (typeof updateHUD === 'function') updateHUD(this.score);

    // Celebra il traguardo
    if (!this.hasCelebratedTarget && this.score >= TARGET_SCORE) {
      this.hasCelebratedTarget = true;
      this.celebrateTarget();
    }

    // Comunica al mondo
    this.events.emit('scoreChanged', this.score);
  }

  emitPizzaParticles(x, y) {
    const particles = this.add.particles(x, y, 'particle', {
      speed: { min: 60, max: 160 },
      lifespan: 500,
      scale: { start: 1, end: 0 },
      tint: [0xF2C878, 0xE85C42, 0xF8E4A0],
      quantity: 10,
      angle: { min: 0, max: 360 },
      gravityY: 200,
      emitting: false,
    });
    particles.setDepth(15);
    particles.explode(12);
    this.time.delayedCall(600, () => particles.destroy());
  }

  showFloatingScore(x, y, text, color) {
    const t = this.add.text(x, y, text, {
      fontSize: '22px',
      fontFamily: 'Aleo, serif',
      color,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(16);
    this.tweens.add({
      targets: t,
      y: y - 40,
      alpha: 0,
      duration: 700,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  showComboLabel(combo) {
    const t = this.add.text(this.knight.x, this.knight.y - 60,
      `Combo x${combo}!`,
      {
        fontSize: '20px',
        fontFamily: 'Aleo, serif',
        color: '#B12C16',
        fontStyle: 'bold italic',
        stroke: '#FFFFFF',
        strokeThickness: 4,
      }
    ).setOrigin(0.5).setDepth(17);
    this.tweens.add({
      targets: t,
      scale: { from: 0.5, to: 1.2 },
      duration: 200,
      yoyo: true,
    });
    this.tweens.add({
      targets: t,
      alpha: 0,
      y: t.y - 20,
      duration: 800,
      delay: 300,
      onComplete: () => t.destroy(),
    });
  }

  celebrateTarget() {
    AvalonAudio.win();
    this.cameras.main.flash(400, 255, 230, 120);
    const banner = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2,
      '🎉 Premio sbloccato!',
      {
        fontSize: '28px',
        fontFamily: 'Aleo, serif',
        color: '#FFFFFF',
        backgroundColor: '#3F6833',
        padding: { x: 20, y: 12 },
        fontStyle: 'bold',
      }
    ).setOrigin(0.5).setDepth(20).setScale(0);
    this.tweens.add({
      targets: banner,
      scale: 1,
      duration: 400,
      ease: 'Back.easeOut',
    });
    this.time.delayedCall(1800, () => {
      this.tweens.add({
        targets: banner,
        alpha: 0,
        duration: 300,
        onComplete: () => banner.destroy(),
      });
    });
  }

  hitBomb(object) {
    const x = object.x, y = object.y;
    object.destroy();
    this.isGameOver = true;

    AvalonAudio.bomb();
    this.cameras.main.shake(350, 0.012);
    this.cameras.main.flash(150, 255, 50, 50);
    this.emitBombParticles(x, y);

    // Stop tutto
    this.knight.setVelocityX(0);
    this.fallingObjects.getChildren().forEach(obj => {
      if (obj && obj.body) {
        obj.setVelocityY(0); obj.setVelocityX(0);
        obj.body.enable = false;
      }
    });
    if (this.spawnTimer) this.spawnTimer.remove();
    this.physics.pause();

    // Salva su leaderboard
    if (typeof leaderboardApi !== 'undefined' && typeof savePlayerBest === 'function') {
      const prevBest = getPlayerBest();
      const isRecord = this.score > prevBest;
      if (isRecord) savePlayerBest(this.score);
      leaderboardApi.submitScore(this.playerName, this.score).then(() => {
        if (typeof renderLeaderboard === 'function') renderLeaderboard();
      });
      this.time.delayedCall(800, () => this.showGameOverPanel(isRecord, prevBest));
    } else {
      this.time.delayedCall(800, () => this.showGameOverPanel(false, 0));
    }
  }

  emitBombParticles(x, y) {
    const particles = this.add.particles(x, y, 'particle', {
      speed: { min: 120, max: 300 },
      lifespan: 700,
      scale: { start: 1.5, end: 0 },
      tint: [0x1A1212, 0xFF6B35, 0xFFD700, 0x7A1E14],
      quantity: 25,
      angle: { min: 0, max: 360 },
      emitting: false,
    });
    particles.setDepth(15);
    particles.explode(25);
    this.time.delayedCall(800, () => particles.destroy());
  }

  showGameOverPanel(isRecord, prevBest) {
    // Overlay scuro
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55)
      .setDepth(20);

    const panelW = 320, panelH = isRecord ? 340 : 300;
    const panel = this.add.graphics().setDepth(21);
    panel.fillStyle(0xFDF6EE, 1);
    panel.fillRoundedRect(GAME_WIDTH / 2 - panelW / 2, GAME_HEIGHT / 2 - panelH / 2, panelW, panelH, 20);
    panel.lineStyle(3, COLORS.red, 1);
    panel.strokeRoundedRect(GAME_WIDTH / 2 - panelW / 2, GAME_HEIGHT / 2 - panelH / 2, panelW, panelH, 20);

    let y = GAME_HEIGHT / 2 - panelH / 2 + 40;

    this.add.text(GAME_WIDTH / 2, y, 'Game Over', {
      fontSize: '32px',
      fontFamily: 'Aleo, serif',
      color: '#2D1D1D',
      fontStyle: 'bold italic',
    }).setOrigin(0.5).setDepth(22);

    y += 50;
    this.add.text(GAME_WIDTH / 2, y, `Punteggio: ${this.score}`, {
      fontSize: '22px',
      fontFamily: 'Aleo, serif',
      color: '#5A413C',
    }).setOrigin(0.5).setDepth(22);

    y += 36;
    if (isRecord) {
      const record = this.add.text(GAME_WIDTH / 2, y, '🏆 Nuovo record personale!', {
        fontSize: '18px',
        fontFamily: 'Aleo, serif',
        color: '#B12C16',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(22);
      this.tweens.add({
        targets: record,
        scale: { from: 0.7, to: 1 },
        duration: 400,
        ease: 'Back.easeOut',
      });
      y += 36;
    } else if (prevBest > 0) {
      this.add.text(GAME_WIDTH / 2, y, `Miglior punteggio: ${prevBest}`, {
        fontSize: '15px',
        fontFamily: 'Aleo, serif',
        color: '#8A7A68',
      }).setOrigin(0.5).setDepth(22);
      y += 36;
    }

    // Bottone riprova
    const btnY = GAME_HEIGHT / 2 + panelH / 2 - 50;
    const btnW = 200, btnH = 54;

    const btnBg = this.add.graphics().setDepth(22);
    const drawBtn = (fill) => {
      btnBg.clear();
      btnBg.fillStyle(fill, 1);
      btnBg.fillRoundedRect(GAME_WIDTH / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 27);
    };
    drawBtn(COLORS.red);

    const btnText = this.add.text(GAME_WIDTH / 2, btnY, 'Riprova', {
      fontSize: '20px',
      fontFamily: 'Aleo, serif',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(23);

    const btnZone = this.add.zone(GAME_WIDTH / 2, btnY, btnW, btnH)
      .setInteractive({ useHandCursor: true })
      .setDepth(23);
    btnZone.on('pointerover', () => drawBtn(COLORS.redLight));
    btnZone.on('pointerout', () => drawBtn(COLORS.red));
    btnZone.on('pointerdown', () => {
      AvalonAudio.click();
      // Reset HUD esterno
      if (typeof updateHUD === 'function') updateHUD(0);
      this.scene.restart({ playerName: this.playerName });
    });

    // Input globale disabilitato (solo il bottone riavvia)
    this.input.off('pointerdown', this.onTap, this);
  }

  update() {
    if (this.isGameOver) return;

    // Movimento cavaliere
    this.knight.setVelocityX(this.movingRight ? this.knightSpeed : -this.knightSpeed);
    this.knight.setFlipX(!this.movingRight);

    // Rimbalzo ai bordi
    if (this.knight.x >= GAME_WIDTH - this.knight.width / 2 - 20 && this.movingRight) {
      this.movingRight = false;
    } else if (this.knight.x <= this.knight.width / 2 + 20 && !this.movingRight) {
      this.movingRight = true;
    }

    // Cleanup, rimbalzo manuale left/right, reset combo su pizza mancata
    const halfObj = 24; // metà larghezza approssimativa a scale 0.9
    this.fallingObjects.getChildren().forEach(obj => {
      if (!obj || !obj.body || !obj.active) return;

      if (obj.y > this.destroyLine) {
        if (obj.getData('type') === 'pizza') this.combo = 0;
        obj.destroy();
        return;
      }

      // Rimbalzo manuale sui bordi laterali
      if (obj.x < halfObj && obj.body.velocity.x < 0) {
        obj.setVelocityX(Math.abs(obj.body.velocity.x));
      } else if (obj.x > GAME_WIDTH - halfObj && obj.body.velocity.x > 0) {
        obj.setVelocityX(-Math.abs(obj.body.velocity.x));
      }
    });
  }
}

// ---------- Factory globale ----------
// Variabile di modulo: usata solo al primo boot (i restart passano i dati via scene.restart)
let _pendingPlayerName = 'Giocatore';

const AvalonGame = {
  instance: null,

  start(playerName) {
    AvalonAudio.resume();
    _pendingPlayerName = playerName;

    if (this.instance) {
      this.instance.destroy(true);
      this.instance = null;
    }

    this.instance = new Phaser.Game({
      type: Phaser.AUTO,
      backgroundColor: '#F4D79A',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        parent: 'game-container',
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
      },
      physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false },
      },
      scene: [AvalonGameScene],
    });
  },
};
