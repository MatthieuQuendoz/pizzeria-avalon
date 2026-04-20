const LINGUE_SUPPORTATE = ['it', 'fr', 'en'];
const LINGUA_DEFAULT = 'it';

const LINGUE_INFO = {
  it: { flag: '🇮🇹', label: 'Italiano' },
  fr: { flag: '🇫🇷', label: 'Français' },
  en: { flag: '🇬🇧', label: 'English' }
};

async function caricaLingua(lingua) {
  try {
    const response = await fetch('data/i18n/' + lingua + '.json');
    const dati = await response.json();
    return dati;
  } catch (error) {
    console.error('Errore nel caricamento del file di lingua:', error);
    return null;
  }
}

function applicaTraduzione(dati) {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const chiavi = el.getAttribute('data-i18n').split('.');
    let traduzione = dati;
    for (const chiave of chiavi) {
      if (traduzione[chiave]) {
        traduzione = traduzione[chiave];
      } else {
        traduzione = null;
        break;
      }
    }
    if (traduzione) {
      el.textContent = traduzione;
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

  document.querySelectorAll('.lang-option').forEach(btn => {
    btn.classList.toggle('lang-option--active', btn.dataset.lang === lingua);
  });
}

function chiudiDropdown() {
  document.getElementById('lang-switcher')?.classList.remove('lang-switcher--open');
}

async function cambiaLingua(lingua) {
  if (!LINGUE_SUPPORTATE.includes(lingua)) return;
  const dati = await caricaLingua(lingua);
  if (!dati) return;
  applicaTraduzione(dati);
  document.getElementById('html-root').setAttribute('lang', lingua);
  localStorage.setItem('lingua', lingua);
  aggiornaSwitcher(lingua);
  chiudiDropdown();
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

  toggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    switcher.classList.toggle('lang-switcher--open');
  });

  document.addEventListener('click', chiudiDropdown);

  document.querySelectorAll('.lang-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      cambiaLingua(btn.dataset.lang);
    });
  });
}

init();
