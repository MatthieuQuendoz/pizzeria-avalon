/* ============================================
   PIZZERIA AVALON — Gioca (orchestratore pagina)
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const intro = document.getElementById('gioca-intro');
  const nameInput = document.getElementById('player-name');
  const startBtn = document.getElementById('start-btn');

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

  // Abilita/disabilita bottone in base a input
  const validate = () => {
    const v = nameInput.value.trim();
    startBtn.disabled = v.length < 2;
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
    if (name.length < 2) return;
    savePlayerName(name);
    intro.classList.add('gioca-intro--hidden');
    AvalonGame.start(name);
    updateHUD(0);
  });

  // Pulsante mute
  const muteBtn = document.getElementById('mute-btn');
  let muted = false;
  muteBtn?.addEventListener('click', () => {
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
