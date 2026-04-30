/* ============================================
   PIZZERIA AVALON — Leaderboard API
   Per ora usa localStorage. Sostituire i due metodi
   di `leaderboardApi` con chiamate HTTP per avere
   una classifica davvero condivisa (Firebase,
   Supabase, endpoint custom, ecc).
   ============================================ */

const LEADERBOARD_KEY = 'avalon_leaderboard_v1';
const PLAYER_NAME_KEY = 'avalon_player_name';
const PLAYER_BEST_KEY = 'avalon_player_best';
const MAX_LEADERBOARD_ENTRIES = 50;
const LEADERBOARD_DISPLAY_COUNT = 7;
const TARGET_SCORE = 50;

const DEFAULT_LEADERBOARD = [
  { name: 'Chef Marco',    score: 124 },
  { name: 'PizzaQueen_92', score: 98  },
  { name: 'BasilLover',    score: 87  },
  { name: 'Ruucola',       score: 70  },
  { name: 'Anacardi',      score: 46  },
  { name: 'Dottor AIkido', score: 33  },
];

const leaderboardApi = {
  async getTopScores() {
    try {
      const raw = localStorage.getItem(LEADERBOARD_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return [...DEFAULT_LEADERBOARD];
  },

  async submitScore(name, score) {
    const scores = await this.getTopScores();
    scores.push({ name, score, date: Date.now() });
    scores.sort((a, b) => b.score - a.score);
    const top = scores.slice(0, MAX_LEADERBOARD_ENTRIES);
    try {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(top));
    } catch (_) {}
    return top;
  },
};

function getPlayerName() {
  return localStorage.getItem(PLAYER_NAME_KEY) || '';
}

function savePlayerName(name) {
  localStorage.setItem(PLAYER_NAME_KEY, name);
}

function getPlayerBest() {
  return parseInt(localStorage.getItem(PLAYER_BEST_KEY) || '0', 10);
}

function savePlayerBest(score) {
  localStorage.setItem(PLAYER_BEST_KEY, String(score));
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

async function renderLeaderboard() {
  const list = document.getElementById('leaderboard-list');
  if (!list) return;
  const board = await leaderboardApi.getTopScores();
  list.innerHTML = board.slice(0, LEADERBOARD_DISPLAY_COUNT).map((entry, i) => {
    const rank = i + 1;
    const rankClass = rank <= 3 ? ` leaderboard-item__rank--${rank}` : '';
    const scoreClass = rank === 1 ? ' leaderboard-item__score--1' : '';
    return `
      <li class="leaderboard-item">
        <span class="leaderboard-item__rank${rankClass}">${rank}</span>
        <span class="leaderboard-item__name">${escapeHtml(entry.name)}</span>
        <span class="leaderboard-item__score${scoreClass}">${entry.score}</span>
      </li>`;
  }).join('');
}

function updateHUD(score, target = TARGET_SCORE) {
  const scoreEl = document.getElementById('score-value');
  const targetEl = document.getElementById('target-value');
  const progressFill = document.getElementById('progress-fill');
  const progressBar = document.getElementById('hud-progress');

  if (scoreEl) scoreEl.textContent = score;
  if (targetEl) targetEl.textContent = target;
  if (progressFill) progressFill.style.width = Math.min(100, Math.round((score / target) * 100)) + '%';
  if (progressBar) progressBar.setAttribute('aria-valuenow', score);

  maybeUnlockPrize(score, target);
}

function maybeUnlockPrize(score, target = TARGET_SCORE) {
  const btn = document.getElementById('premio-btn');
  if (!btn) return;
  if (score >= target && !btn.classList.contains('gioca-premio__btn--unlocked')) {
    btn.disabled = false;
    btn.classList.add('gioca-premio__btn--unlocked');
    btn.innerHTML = '<i data-lucide="gift"></i> Ritira il tuo omaggio!';
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}
