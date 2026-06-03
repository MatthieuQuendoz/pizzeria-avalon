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

    link.addEventListener('pointerdown', () => {
      if (typeof AvalonGame !== 'undefined' && AvalonGame.isRunning()) {
        AvalonGame.stopForNavigation();
      }
    }, { capture: true });

    link.addEventListener('click', (e) => {
      if (typeof AvalonGame === 'undefined' || !AvalonGame.isRunning()) return;
      e.preventDefault();
      AvalonGame.stopForNavigation();
      window.location.href = href;
    }, { capture: true });
  });

  const intro = document.getElementById('gioca-intro');
  const nameInput = document.getElementById('player-name');
  const startBtn = document.getElementById('start-btn');
  const preloadStatus = document.getElementById('preload-status');

  // Preload asset gioco (bg.png) prima di permettere lo start
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

  // Render iniziale
  renderLeaderboard();
  updateHUD(0);
});

// Aggiorna la leaderboard quando cambia la lingua (per il caso di chiavi tradotte)
document.addEventListener('linguaCambiata', () => {
  renderLeaderboard();
});
