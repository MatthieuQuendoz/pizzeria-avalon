const LINGUE_SUPPORTATE = ['it', 'fr', 'en'];
const LINGUA_DEFAULT = 'it';

const LINGUE_INFO = {
  it: { flag: '🇮🇹', label: 'Italiano' },
  fr: { flag: '🇫🇷', label: 'Français' },
  en: { flag: '🇬🇧', label: 'English' }
};
const SWITCHER_LABELS = { it: 'Cambia lingua', fr: 'Changer de langue', en: 'Change language' };
let languageRequestId = 0;

async function caricaLingua(lingua) {
  try {
    const response = await fetch('data/i18n/' + lingua + '.json');
    if (!response.ok) throw new Error(`Lingua HTTP ${response.status}`);
    const dati = await response.json();
    return dati;
  } catch (error) {
    console.error('Errore nel caricamento del file di lingua:', error);
    return null;
  }
}

// Traduzioni correnti accessibili dagli altri script (es. testi generati da JS).
window.i18nData = null;
window.t = function (chiave) {
  let valore = window.i18nData;
  for (const parte of String(chiave).split('.')) {
    if (valore && typeof valore === 'object' && parte in valore) {
      valore = valore[parte];
    } else {
      return null;
    }
  }
  return typeof valore === 'string' ? valore : null;
};

function applicaTraduzione(dati) {
  window.i18nData = dati;
  function valore(chiave) {
    const chiavi = chiave.split('.');
    let traduzione = dati;
    for (const chiave of chiavi) {
      if (traduzione[chiave]) {
        traduzione = traduzione[chiave];
      } else {
        return null;
      }
    }
    return typeof traduzione === 'string' ? traduzione : null;
  }
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const translated = valore(el.getAttribute('data-i18n'));
    if (translated) el.textContent = translated;
  });
  document.querySelectorAll('[data-i18n-placeholder], [data-i18n-aria-label]').forEach(el => {
    for (const [attribute, key] of [['placeholder', 'data-i18n-placeholder'], ['aria-label', 'data-i18n-aria-label']]) {
      const translationKey = el.getAttribute(key);
      if (!translationKey) continue;
      const translated = valore(translationKey);
      if (translated) el.setAttribute(attribute, translated);
    }
  });
}

function rilevaLingua() {
  const lingua = localStorage.getItem('lingua');
  if (lingua && LINGUE_SUPPORTATE.includes(lingua)) {
    return lingua;
  }
  const navigatorLingua = navigator.language.slice(0, 2);
  if (LINGUE_SUPPORTATE.includes(navigatorLingua)) {
    return navigatorLingua;
  }
  return LINGUA_DEFAULT;
}

function aggiornaSwitcher(lingua) {
  const info = LINGUE_INFO[lingua];
  const flagEl = document.getElementById('lang-current-flag');
  const codeEl = document.getElementById('lang-current-code');
  if (flagEl) flagEl.textContent = info.flag;
  if (codeEl) codeEl.textContent = lingua.toUpperCase();
  document.getElementById('lang-toggle')?.setAttribute('aria-label', SWITCHER_LABELS[lingua]);

  document.querySelectorAll('.lang-option').forEach(btn => {
    const active = btn.dataset.lang === lingua;
    btn.classList.toggle('lang-option--active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function chiudiDropdown() {
  document.getElementById('lang-switcher')?.classList.remove('lang-switcher--open');
  document.getElementById('lang-toggle')?.setAttribute('aria-expanded', 'false');
}

async function cambiaLingua(lingua) {
  if (!LINGUE_SUPPORTATE.includes(lingua)) return;
  const requestId = ++languageRequestId;
  const dati = await caricaLingua(lingua);
  if (requestId !== languageRequestId) return;
  if (!dati) return;
  applicaTraduzione(dati);
  document.getElementById('html-root').setAttribute('lang', lingua);
  localStorage.setItem('lingua', lingua);
  aggiornaSwitcher(lingua);
  chiudiDropdown();

  document.dispatchEvent(new CustomEvent('linguaCambiata', { detail: { lingua } }));

}

async function init() {
  const lingua = rilevaLingua();
  const dati = await caricaLingua(lingua);
  if (!dati) return;
  applicaTraduzione(dati);
  document.getElementById('html-root').setAttribute('lang', lingua);
  localStorage.setItem('lingua', lingua);
  aggiornaSwitcher(lingua);

  const toggle = document.getElementById('lang-toggle');
  const switcher = document.getElementById('lang-switcher');

  toggle?.setAttribute('aria-controls', 'lang-dropdown');
  toggle?.setAttribute('aria-expanded', 'false');

  toggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = switcher.classList.toggle('lang-switcher--open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  document.addEventListener('click', chiudiDropdown);
  switcher?.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !switcher.classList.contains('lang-switcher--open')) return;
    chiudiDropdown();
    toggle.focus();
  });

  document.querySelectorAll('.lang-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      cambiaLingua(btn.dataset.lang);
    });
  });
}

init();
