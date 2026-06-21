/* ============================================
   PIZZERIA AVALON — Gioca (orchestratore pagina)
   ============================================ */

// Hooks chiamati da gioca-game.js per la schermata vittoria
function showVictoryModal() {
  const m = document.getElementById('victory-modal');
  if (m) m.hidden = false;
}
function hideVictoryModal() {
  const m = document.getElementById('victory-modal');
  if (m) m.hidden = true;
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-links a[href]').forEach((link) => {
    const href = link.getAttribute('href') || '';
    if (!href || href.includes('gioca.html')) return;

    // Stop immediato di loop e audio prima di lasciare la pagina.
    // La navigazione vera e propria e' gestita dal browser (View Transitions
    // native) o da page-transitions.js (fallback slide + fade).
    link.addEventListener('pointerdown', () => {
      if (typeof AvalonGame !== 'undefined' && AvalonGame.isRunning()) {
        AvalonGame.stopForNavigation();
      }
    }, { capture: true });
  });

  const intro = document.getElementById('gioca-intro');
  const nameInput = document.getElementById('player-name');
  const startBtn = document.getElementById('start-btn');
  const preloadStatus = document.getElementById('preload-status');

  // Preload asset gioco (bg.webp) prima di permettere lo start
  let assetsReady = false;
  AvalonGame.preload().then(() => {
    assetsReady = true;
    if (preloadStatus) preloadStatus.hidden = true;
    validate();
  });

  // Precompila nome se già salvato
  const savedName = getPlayerName();
  if (savedName) nameInput.value = savedName;

  // Mostra record personale nell'intro (se esiste)
  const best = getPlayerBest();
  const introRecord = document.getElementById('intro-record');
  if (best > 0 && introRecord) {
    document.getElementById('intro-record-value').textContent = best;
    introRecord.hidden = false;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  // Abilita/disabilita bottone in base a input + preload
  const validate = () => {
    const v = nameInput.value.trim();
    startBtn.disabled = v.length < 2 || !assetsReady;
  };
  nameInput.addEventListener('input', validate);
  validate();

  // Submit con Enter
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !startBtn.disabled) startBtn.click();
  });

  // Avvio partita
  startBtn.addEventListener('click', () => {
    const name = nameInput.value.trim().slice(0, 15);
    if (name.length < 2 || !assetsReady) return;
    savePlayerName(name);
    AvalonAudio.unlock();
    intro.classList.add('gioca-intro--hidden');
    AvalonGame.start(name);
    updateHUD(0);
  });

  // Victory modal buttons
  document.getElementById('victory-continue')?.addEventListener('click', () => {
    AvalonAudio.resume();
    hideVictoryModal();
    AvalonGame.resumeAfterVictory();
  });
  document.getElementById('victory-end')?.addEventListener('click', () => {
    AvalonAudio.resume();
    hideVictoryModal();
    AvalonGame.endAfterVictory();
  });

  // Pulsante mute
  const muteBtn = document.getElementById('mute-btn');
  let muted = false;
  muteBtn?.addEventListener('click', () => {
    AvalonAudio.resume();
    muted = !muted;
    AvalonAudio.setEnabled(!muted);
    const icon = document.getElementById('mute-icon');
    if (icon) icon.setAttribute('data-lucide', muted ? 'volume-x' : 'volume-2');
    muteBtn.classList.toggle('gioca-mute-btn--muted', muted);
    if (typeof lucide !== 'undefined') lucide.createIcons();
  });

  // Pulsante premio: festeggia (coriandoli) e mostra il messaggio per la cassa
  const premioBtn = document.getElementById('premio-btn');
  premioBtn?.addEventListener('click', () => {
    if (premioBtn.disabled) return;
    if (typeof AvalonAudio !== 'undefined') {
      AvalonAudio.resume();
      AvalonAudio.win();
    }
    const cassa = document.getElementById('premio-cassa');
    if (cassa) cassa.hidden = false;
    launchConfetti();
  });

  // Render iniziale
  renderLeaderboard();
  updateHUD(0);
});

/* Coriandoli "DOM" indipendenti dal canvas: festeggiano il ritiro del premio. */
function launchConfetti(count = 90) {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#B12C16', '#D4A828', '#3F6833', '#E87020', '#FDF6EE', '#2A6818'];
  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText =
    'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden';
  document.body.appendChild(layer);

  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    const size = 6 + Math.random() * 8;
    piece.style.cssText =
      `position:absolute;top:-5vh;left:${Math.random() * 100}vw;` +
      `width:${size}px;height:${size * 0.6}px;` +
      `background:${colors[(Math.random() * colors.length) | 0]};` +
      `opacity:0.95;border-radius:1px`;
    layer.appendChild(piece);

    const dx = (Math.random() - 0.5) * 240;
    const dur = 2200 + Math.random() * 1600;
    const rot = (Math.random() - 0.5) * 1080;
    piece.animate(
      [
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx}px, 110vh) rotate(${rot}deg)`, opacity: 1 },
      ],
      { duration: dur, easing: 'cubic-bezier(.2,.6,.4,1)', delay: Math.random() * 400 }
    );
  }

  setTimeout(() => layer.remove(), 4600);
}

// Aggiorna la leaderboard quando cambia la lingua (per il caso di chiavi tradotte)
document.addEventListener('linguaCambiata', () => {
  renderLeaderboard();
});
