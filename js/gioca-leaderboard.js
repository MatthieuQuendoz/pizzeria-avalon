/* ============================================
   PIZZERIA AVALON — Leaderboard API
   Classifica reale e condivisa tramite Supabase.
   Le credenziali vanno in gioca.html (window.AVALON_SUPABASE_*).
   Setup tabella + policy: vedi supabase/leaderboard.sql.
   Se le credenziali mancano o la rete fallisce, si usa
   un fallback locale (localStorage) per non rompere la pagina.
   ============================================ */

const LEADERBOARD_KEY = 'avalon_leaderboard_v1';
const PLAYER_NAME_KEY = 'avalon_player_name';
const PLAYER_BEST_KEY = 'avalon_player_best';
const MAX_LEADERBOARD_ENTRIES = 50;
const LEADERBOARD_DISPLAY_COUNT = 7;
const TARGET_SCORE = 50;
const MAX_SCORE = 100;
const LEADERBOARD_TABLE = 'leaderboard';

// Normalizza un punteggio entro i limiti consentiti (0–100).
// Difesa lato client: punteggi piu alti sono impossibili nel gioco
// e indicano manomissioni (vedi vincolo SQL in supabase/leaderboard.sql).
function sanitizeScore(score) {
  const n = Math.round(Number(score));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(MAX_SCORE, n));
}

const DEFAULT_LEADERBOARD = [
  { name: 'Chef Marco',    score: 99  },
  { name: 'PizzaQueen_92', score: 98  },
  { name: 'BasilLover',    score: 87  },
  { name: 'Ruucola',       score: 70  },
  { name: 'Anacardi',      score: 46  },
  { name: 'Dottor AIkido', score: 33  },
];

// — Client Supabase (creato una sola volta, se configurato) —
let _supabaseClient = null;
let _supabaseInit = false;
function getSupabase() {
  if (_supabaseInit) return _supabaseClient;
  _supabaseInit = true;
  const url = (window.AVALON_SUPABASE_URL || '').trim();
  const key = (window.AVALON_SUPABASE_ANON_KEY || '').trim();
  if (url && key && window.supabase && typeof window.supabase.createClient === 'function') {
    try {
      _supabaseClient = window.supabase.createClient(url, key);
    } catch (err) {
      console.error('Supabase non inizializzato:', err);
    }
  }
  return _supabaseClient;
}

// — Fallback locale (usato solo se Supabase non è disponibile) —
const localLeaderboard = {
  get() {
    try {
      const raw = localStorage.getItem(LEADERBOARD_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return [...DEFAULT_LEADERBOARD];
  },
  add(name, score) {
    const scores = this.get().filter(e => e.score <= MAX_SCORE);
    scores.push({ name, score: sanitizeScore(score), date: Date.now() });
    scores.sort((a, b) => b.score - a.score);
    const top = scores.slice(0, MAX_LEADERBOARD_ENTRIES);
    try {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(top));
    } catch (_) {}
    return top;
  },
};

const leaderboardApi = {
  async getTopScores() {
    const sb = getSupabase();
    if (sb) {
      try {
        const { data, error } = await sb
          .from(LEADERBOARD_TABLE)
          .select('name, score')
          .order('score', { ascending: false })
          .limit(MAX_LEADERBOARD_ENTRIES);
        if (error) throw error;
        // Difesa lato client: nasconde eventuali punteggi impossibili
        // ancora presenti nel DB (es. inviati prima del fix del vincolo).
        if (Array.isArray(data)) return data.filter(e => Number(e.score) <= MAX_SCORE);
      } catch (err) {
        console.error('Errore nel caricamento della classifica:', err);
      }
    }
    return localLeaderboard.get().filter(e => e.score <= MAX_SCORE);
  },

  async submitScore(name, score) {
    const safeScore = sanitizeScore(score);
    const sb = getSupabase();
    if (sb) {
      try {
        const { error } = await sb
          .from(LEADERBOARD_TABLE)
          .insert({ name, score: safeScore });
        if (error) throw error;
        return await this.getTopScores();
      } catch (err) {
        console.error('Errore nel salvataggio del punteggio:', err);
      }
    }
    return localLeaderboard.add(name, safeScore);
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
    const label = (typeof window.t === 'function' && window.t('gioca.premio_unlocked')) || 'Ritira il tuo omaggio!';
    // span con data-i18n: resta tradotto anche al cambio lingua
    btn.innerHTML = `<i data-lucide="gift"></i> <span data-i18n="gioca.premio_unlocked">${escapeHtml(label)}</span>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}
