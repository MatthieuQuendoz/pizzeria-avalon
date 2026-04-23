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

  // Render iniziale
  renderLeaderboard();
  updateHUD(0);
});

// Aggiorna la leaderboard quando cambia la lingua (per il caso di chiavi tradotte)
document.addEventListener('linguaCambiata', () => {
  renderLeaderboard();
});
