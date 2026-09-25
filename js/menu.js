let categoriaCorrente = null;
let categorieGlobali = null;
let menuFileCorrente = 'menu-cibo.json';
let filtroTagCorrente = null;
let menuRequestId = 0;
let menuStatus = null;
let retryMenu = null;

const TAG_CONFIG = {
  'vegan': { emoji: '🌱', label: { it: 'Vegan', fr: 'Végane', en: 'Vegan' } },
  'vegetariana': { emoji: '🥗', label: { it: 'Vegetariana', fr: 'Végétarienne', en: 'Vegetarian' } },
  'piccante': { emoji: '🌶️', label: { it: 'Piccante', fr: 'Épicé', en: 'Spicy' } },
  'immodificabile': { emoji: '🔒', label: { it: 'Immodificabile', fr: 'Fixe', en: 'Fixed' } },
  'senza glutine': { emoji: '🌾', label: { it: 'Senza glutine', fr: 'Sans gluten', en: 'Gluten-free' } },
  'senza lattosio': { emoji: '🥛', label: { it: 'Senza lattosio', fr: 'Sans lactose', en: 'Lactose-free' } },
  'locale': { emoji: '🏔️', label: { it: 'Locale', fr: 'Local', en: 'Local' } },
  'Classica': { emoji: '🎩', label: { it: 'Classica', fr: 'Classique', en: 'Classic' } },
  'new': { emoji: '✨', label: { it: 'Nuovo', fr: 'Nouveau', en: 'New' } },
  'dedicata': { emoji: '❤️', label: { it: 'Dedicata a...', fr: 'Dédiée à...', en: 'Dedicated to...' } },
  'mangioni': { emoji: '😋', label: { it: 'Da mangioni', fr: 'Pour gros mangeurs', en: 'For big eaters' } },
  'popular': { emoji: '⭐', label: { it: 'Popolare', fr: 'Populaire', en: 'Popular' } }
};

const FILTRO_LABELS = {
  filtra: { it: 'Filtra', fr: 'Filtrer', en: 'Filter' },
  filtraPer: { it: 'Filtra per', fr: 'Filtrer par', en: 'Filter by' },
  tutte: { it: 'Tutte', fr: 'Toutes', en: 'All' }
};

const PRICE_LABELS = {
  'piccola (20cl)': { it: 'piccola (20 cl)', fr: 'petite (20 cl)', en: 'small (20 cl)' },
  'piccola (30cl)': { it: 'piccola (30 cl)', fr: 'petite (30 cl)', en: 'small (30 cl)' },
  'media (40cl)': { it: 'media (40 cl)', fr: 'moyenne (40 cl)', en: 'medium (40 cl)' },
  'media (50cl)': { it: 'media (50 cl)', fr: 'moyenne (50 cl)', en: 'medium (50 cl)' },
  'caraffa (1L)': { it: 'caraffa (1 l)', fr: 'carafe (1 l)', en: 'jug (1 l)' },
  bottiglia: { it: 'bottiglia', fr: 'bouteille', en: 'bottle' },
  calice: { it: 'calice', fr: 'verre', en: 'glass' },
  'normale (5 palline)': { it: 'normale (5 palline)', fr: 'normale (5 boules)', en: 'regular (5 scoops)' },
  'piccolo (3 palline)': { it: 'piccolo (3 palline)', fr: 'petite (3 boules)', en: 'small (3 scoops)' },
  normale: { it: 'normale', fr: 'normale', en: 'regular' },
  mini: { it: 'mini', fr: 'mini', en: 'mini' },
};

function linguaMenu() {
  return document.documentElement.lang || 'it';
}

function etichettaPrezzo(chiave) {
  return PRICE_LABELS[chiave]?.[linguaMenu()] || chiave;
}

function euro(valore) {
  return new Intl.NumberFormat(linguaMenu(), { style: 'currency', currency: 'EUR' }).format(valore);
}


// Aggiorna larghezza e posizione del "thumb" dell'indicatore di scroll
// per uno specifico wrapper (.menu-tabs-wrap). Se omesso, aggiorna tutti.
function aggiornaIndicatore(wrap) {
  if (!wrap) {
    document.querySelectorAll('.menu-tabs-wrap').forEach(aggiornaIndicatore);
    return;
  }
  const tabs = wrap.querySelector('.menu-tabs');
  const indicator = wrap.querySelector('.menu-tabs-indicator');
  const thumb = indicator?.querySelector('.menu-tabs-indicator__thumb');
  if (!tabs || !indicator || !thumb) return;
  const scrollable = tabs.scrollWidth - tabs.clientWidth;
  if (scrollable <= 1) {
    wrap.classList.add('is-not-scrollable');
    return;
  }
  wrap.classList.remove('is-not-scrollable');
  const ratio = tabs.clientWidth / tabs.scrollWidth;
  const progress = tabs.scrollLeft / scrollable;
  const trackW = indicator.clientWidth;
  const thumbW = Math.max(24, trackW * ratio);
  const maxLeft = trackW - thumbW;
  thumb.style.width = thumbW + 'px';
  thumb.style.transform = `translateX(${progress * maxLeft}px)`;
}

// Short guided return from the bottom category bar. User input always wins.
let scrollRafId = 0;
let scrollAbort = null;
function interrompiScrollGuidato() {
  if (scrollRafId) cancelAnimationFrame(scrollRafId);
  scrollRafId = 0;
  scrollAbort?.abort();
  scrollAbort = null;
}
function scrollVerticaleFluido(targetY, durata = 350) {
  interrompiScrollGuidato();
  const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const destino = Math.min(Math.max(0, targetY), maxY);
  const partenza = window.scrollY || window.pageYOffset;
  const delta = destino - partenza;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || Math.abs(delta) < 1) {
    window.scrollTo(0, destino);
    return;
  }

  const controller = new AbortController();
  scrollAbort = controller;
  for (const type of ['wheel', 'touchstart', 'keydown', 'pointerdown']) {
    window.addEventListener(type, interrompiScrollGuidato,
      { passive: true, signal: controller.signal });
  }
  const start = performance.now();
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const step = now => {
    const t = Math.min(1, (now - start) / durata);
    window.scrollTo(0, partenza + delta * easeOut(t));
    if (t < 1) scrollRafId = requestAnimationFrame(step);
    else interrompiScrollGuidato();
  };
  scrollRafId = requestAnimationFrame(step);
}

// Offset da sottrarre al target di scroll: altezza della navbar fissa in alto
// (layout desktop). Su mobile la navbar è ancorata in basso, quindi 0.
function offsetScrollTop() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return 0;
  const stile = getComputedStyle(navbar);
  if (stile.position !== 'fixed') return 0;
  // Navbar in alto solo quando il suo bordo superiore è vicino a 0.
  if (navbar.getBoundingClientRect().top > 80) return 0;
  return navbar.offsetHeight + 16;
}

//Questa funziona prende i dati da menu.json
async function caricaMenu(file) {
  try {
    const response = await fetch('data/' + file);
    if (!response.ok) throw new Error(`Menu HTTP ${response.status}`);
    const dati = await response.json();
    if (!Array.isArray(dati?.categorie) || !dati.categorie.length) throw new Error('Menu senza categorie');
    return dati;
  } catch (error) {
    console.error('Errore nel caricamento del file:', error);
    return null;
  }
}

const MENU_STATUS_LABELS = {
  loading: { it: 'Caricamento menu…', fr: 'Chargement du menu…', en: 'Loading menu…' },
  error: { it: 'Non riusciamo a caricare il menu. Riprova.', fr: 'Impossible de charger le menu. Réessayez.', en: 'We could not load the menu. Please try again.' },
  retry: { it: 'Riprova', fr: 'Réessayer', en: 'Try again' },
};

function aggiornaStatoMenu() {
  const box = document.getElementById('menu-status');
  const message = document.getElementById('menu-status-text');
  const retry = document.getElementById('menu-retry');
  if (!box || !message || !retry) return;
  box.hidden = !menuStatus;
  if (!menuStatus) return;
  const lingua = document.documentElement.lang || 'it';
  message.textContent = MENU_STATUS_LABELS[menuStatus][lingua] || MENU_STATUS_LABELS[menuStatus].it;
  retry.hidden = menuStatus !== 'error';
  retry.textContent = MENU_STATUS_LABELS.retry[lingua] || MENU_STATUS_LABELS.retry.it;
  box.setAttribute('role', menuStatus === 'error' ? 'alert' : 'status');
}

function mostraStatoMenu(status, retry) {
  menuStatus = status;
  retryMenu = retry || null;
  aggiornaStatoMenu();
}

document.getElementById('menu-retry')?.addEventListener('click', () => retryMenu?.());


function creaTabs(categorie) {
  const containers = [
    document.getElementById('menu-tabs'),
    document.getElementById('menu-tabs-bottom'),
  ].filter(Boolean);

  const lingua = localStorage.getItem('lingua') || 'it';

  categorie.forEach((categoria, index) => {
    containers.forEach(container => {
      const tab = document.createElement('button');
      tab.classList.add('menu-tab');
      tab.dataset.tabIndex = index;
      const selected = categoriaCorrente === categoria || (!categoriaCorrente && index === 0);
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-pressed', selected ? 'true' : 'false');
      tab.textContent = categoria.nome[lingua] || categoria.nome.it;

      tab.addEventListener('click', () => {
        // Sincronizza active su tutti i tab (top + bottom) con lo stesso indice
        document.querySelectorAll('.menu-tab').forEach(t => {
          const active = t.dataset.tabIndex === String(index);
          t.classList.toggle('active', active);
          t.setAttribute('aria-pressed', active ? 'true' : 'false');
        });

        // Centra orizzontalmente il tab corrispondente nella barra superiore
        // (solo asse X: così non interferisce con lo scroll verticale).
        const topTabs = document.getElementById('menu-tabs');
        const topTab = topTabs?.querySelector(`.menu-tab[data-tab-index="${index}"]`);
        if (topTabs && topTab) {
          const left = topTab.offsetLeft + topTab.offsetWidth / 2 - topTabs.clientWidth / 2;
          topTabs.scrollTo({ left, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        }

        const daSliderBottom = !!tab.closest('#menu-tabs-bottom');

        // Prima renderizza la nuova lista, poi (dopo il layout) calcola il
        // target e scrolla: evita di puntare a una posizione della lista vecchia.
        filtroTagCorrente = null;
        mostraPizze(categoria);

        if (daSliderBottom) {
          requestAnimationFrame(() => requestAnimationFrame(() => {
            const wrap = document.getElementById('menu-tabs-wrap');
            if (!wrap) return;
            const targetY = (window.scrollY || window.pageYOffset)
              + wrap.getBoundingClientRect().top - offsetScrollTop();
            scrollVerticaleFluido(targetY);
          }));
        }
      });

      container.appendChild(tab);
    });
  });
}



function creaTagBadge(tag, lingua) {
  const config = TAG_CONFIG[tag];
  if (!config) return null;
  const span = document.createElement('span');
  span.classList.add('item-tag', `item-tag--${tag.replace(/\s+/g, '-')}`);
  span.textContent = `${config.emoji} ${config.label[lingua]}`;
  return span;
}

function creaBloccoGusti(categoria, lingua) {
  if (!categoria.gusti?.length) return null;

  const block = document.createElement('div');
  block.classList.add('menu-gusti');

  if (categoria.intro) {
    const intro = document.createElement('p');
    intro.classList.add('menu-gusti__intro');
    intro.textContent = categoria.intro[lingua] || categoria.intro.it;
    block.appendChild(intro);
  }

  const list = document.createElement('div');
  list.classList.add('menu-gusti__list');

  categoria.gusti.forEach(gusto => {
    const chip = document.createElement('div');
    chip.classList.add('menu-gusti__chip');

    const name = document.createElement('span');
    name.classList.add('menu-gusti__name');
    name.textContent = gusto.nome[lingua] || gusto.nome.it;
    chip.appendChild(name);

    if (gusto.tag?.length) {
      const tags = document.createElement('div');
      tags.classList.add('menu-gusti__tags');
      gusto.tag.forEach(t => {
        const badge = creaTagBadge(t, lingua);
        if (badge) tags.appendChild(badge);
      });
      chip.appendChild(tags);
    }

    list.appendChild(chip);
  });

  block.appendChild(list);
  return block;
}

function creaTitoloCategoria(categoria, lingua) {
  if (!categoria.intro || categoria.gusti?.length) return null;

  const titolo = document.createElement('p');
  titolo.classList.add('menu-categoria-titolo');
  titolo.textContent = categoria.intro[lingua] || categoria.intro.it;
  return titolo;
}

function creaBloccoAggiunte(categoria, lingua) {
  if (!categoria.aggiunte?.length) return null;

  const block = document.createElement('div');
  block.classList.add('menu-gusti', 'menu-aggiunte');

  if (categoria.aggiunteIntro) {
    const intro = document.createElement('p');
    intro.classList.add('menu-gusti__intro');
    intro.textContent = categoria.aggiunteIntro[lingua] || categoria.aggiunteIntro.it;
    block.appendChild(intro);
  }

  const list = document.createElement('div');
  list.classList.add('menu-gusti__list');

  categoria.aggiunte.forEach(aggiunta => {
    const chip = document.createElement('div');
    chip.classList.add('menu-gusti__chip');

    const name = document.createElement('span');
    name.classList.add('menu-gusti__name');
    name.textContent = aggiunta.nome[lingua] || aggiunta.nome.it;
    chip.appendChild(name);

    if (aggiunta.prezzo != null) {
      const price = document.createElement('span');
      price.classList.add('menu-aggiunte__price');
      price.textContent = euro(aggiunta.prezzo);
      chip.appendChild(price);
    }

    list.appendChild(chip);
  });

  block.appendChild(list);
  return block;
}

function creaFiltriTag(categoria, lingua) {
  const container = document.getElementById('menu-filtri');
  if (!container) return;
  container.innerHTML = '';
  container.classList.remove('is-open');

  // Tag unici presenti negli item, nell'ordine definito in TAG_CONFIG
  const presenti = new Set();
  categoria.items.forEach(item => {
    (item.tag || []).forEach(t => {
      if (TAG_CONFIG[t]) presenti.add(t);
    });
  });
  const tags = Object.keys(TAG_CONFIG).filter(t => presenti.has(t));

  // Meno di 2 tag: filtro non utile, nascondi tutto
  if (tags.length < 2) {
    container.hidden = true;
    return;
  }
  container.hidden = false;

  const L = (obj) => (obj && (obj[lingua] || obj.it)) || '';
  const tagAttivo = filtroTagCorrente && TAG_CONFIG[filtroTagCorrente]
    ? TAG_CONFIG[filtroTagCorrente]
    : null;

  // — Pulsante che apre/chiude il piccolo menu —
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.classList.add('menu-filtri__toggle');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'menu-filtri-panel');
  if (tagAttivo) toggle.classList.add('is-active');

  const icon = document.createElement('i');
  icon.setAttribute('data-lucide', 'sliders-horizontal');
  icon.setAttribute('aria-hidden', 'true');

  const toggleLabel = document.createElement('span');
  toggleLabel.classList.add('menu-filtri__toggle-label');
  toggleLabel.textContent = tagAttivo
    ? `${tagAttivo.emoji} ${L(tagAttivo.label)}`
    : L(FILTRO_LABELS.filtra);

  const chevron = document.createElement('span');
  chevron.classList.add('menu-filtri__chevron');
  chevron.setAttribute('aria-hidden', 'true');
  chevron.textContent = '▾';

  toggle.append(icon, toggleLabel, chevron);

  // — Pannello dropdown con i chip —
  const panel = document.createElement('div');
  panel.classList.add('menu-filtri__panel');
  panel.id = 'menu-filtri-panel';
  panel.hidden = true;

  const titolo = document.createElement('p');
  titolo.classList.add('menu-filtri__titolo');
  titolo.textContent = L(FILTRO_LABELS.filtraPer);
  panel.appendChild(titolo);

  const lista = document.createElement('div');
  lista.classList.add('menu-filtri__list');

  const applica = (valore) => {
    filtroTagCorrente = valore;
    mostraPizze(categoria);
  };

  const chipTutte = document.createElement('button');
  chipTutte.type = 'button';
  chipTutte.classList.add('menu-filtro', 'menu-filtro--tutte');
  if (filtroTagCorrente === null) chipTutte.classList.add('active');
  chipTutte.setAttribute('aria-pressed', filtroTagCorrente === null ? 'true' : 'false');
  chipTutte.textContent = L(FILTRO_LABELS.tutte);
  chipTutte.addEventListener('click', () => applica(null));
  lista.appendChild(chipTutte);

  tags.forEach(tag => {
    const config = TAG_CONFIG[tag];
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.classList.add('menu-filtro', `menu-filtro--${tag.replace(/\s+/g, '-')}`);
    if (filtroTagCorrente === tag) chip.classList.add('active');
    chip.setAttribute('aria-pressed', filtroTagCorrente === tag ? 'true' : 'false');
    chip.textContent = `${config.emoji} ${L(config.label)}`;
    // Toggle: riclic sullo stesso tag azzera il filtro
    chip.addEventListener('click', () => applica(filtroTagCorrente === tag ? null : tag));
    lista.appendChild(chip);
  });

  panel.appendChild(lista);

  let closeTimer = 0;
  const closePanel = () => {
    clearTimeout(closeTimer);
    container.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      panel.hidden = true;
      return;
    }
    panel.classList.add('is-closing');
    closeTimer = setTimeout(() => {
      if (!container.classList.contains('is-open')) panel.hidden = true;
      panel.classList.remove('is-closing');
    }, 130);
  };

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    if (container.classList.contains('is-open')) {
      closePanel();
    } else {
      clearTimeout(closeTimer);
      panel.classList.remove('is-closing');
      panel.hidden = false;
      container.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
    }
  });

  container.addEventListener('close-filter', closePanel);
  container.onkeydown = (e) => {
    if (e.key !== 'Escape' || !container.classList.contains('is-open')) return;
    closePanel();
    toggle.focus();
  };

  container.append(toggle, panel);

  // Rigenera l'icona Lucide appena inserita
  if (window.lucide) lucide.createIcons();
}

// Chiude il menu filtri cliccando fuori
document.addEventListener('click', (e) => {
  const container = document.getElementById('menu-filtri');
  if (!container || !container.classList.contains('is-open')) return;
  if (container.contains(e.target)) return;
  container.dispatchEvent(new Event('close-filter'));
});

let menuCardObserver = null;
function mostraPizze(categoria) {
  categoriaCorrente = categoria;
  menuCardObserver?.disconnect();
  menuCardObserver = null;

  const container = document.getElementById('menu-lista');
  container.innerHTML = '';

  const lingua = localStorage.getItem('lingua') || 'it';

  creaFiltriTag(categoria, lingua);

  const bloccoGusti = creaBloccoGusti(categoria, lingua);
  if (bloccoGusti) container.appendChild(bloccoGusti);

  const titoloCategoria = creaTitoloCategoria(categoria, lingua);
  if (titoloCategoria) container.appendChild(titoloCategoria);

  const items = filtroTagCorrente
    ? categoria.items.filter(i => (i.tag || []).includes(filtroTagCorrente))
    : categoria.items;

  items.forEach(item => {
    const card = document.createElement('div');
    card.classList.add('item-card');

    // — sinistra: corpo testuale —
    const body = document.createElement('div');
    body.classList.add('item-card__body');

    const tags = document.createElement('div');
    tags.classList.add('item-tags');
    item.tag.forEach(t => {
      const badge = creaTagBadge(t, lingua);
      if (badge) tags.appendChild(badge);
    });

    const nome = document.createElement('h3');
    nome.classList.add('item-card__name');
    nome.textContent = item.nome;

    body.appendChild(tags);
    body.appendChild(nome);

    const nota = testoNota(item, lingua);
    if (nota) {
      const noteEl = document.createElement('span');
      noteEl.classList.add('item-card__note');
      noteEl.textContent = nota;
      body.appendChild(noteEl);
    }

    const descrizione = document.createElement('p');
    descrizione.classList.add('item-card__desc');
    descrizione.textContent = item.descrizione[lingua] || item.descrizione.it;
    body.appendChild(descrizione);

    if (item.prezzi) {
      body.appendChild(creaListaPrezzi(item));
    } else {
      const prezzo = document.createElement('span');
      prezzo.classList.add('item-price');
      prezzo.textContent = formattaPrezzo(item);
      body.appendChild(prezzo);
    }

    // — destra: immagine —
    // Momentaneamente nascosta per tutta la categoria Bevande: solo testo.
    const mostraMedia = menuFileCorrente !== 'menu-bevande.json';

    if (mostraMedia) {
      const media = document.createElement('div');
      media.classList.add('item-card__media');

      if (item.immagine) {
        const img = document.createElement('img');
        img.src = item.immagine;
        img.alt = item.nome;
        img.width = 200;
        img.height = 200;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.classList.add('item-card__img');
        media.appendChild(img);
      } else {
        const placeholder = document.createElement('div');
        placeholder.classList.add('item-card__placeholder');
        placeholder.setAttribute('aria-hidden', 'true');
        placeholder.textContent = { it: 'Foto in arrivo', fr: 'Photo à venir', en: 'Photo coming soon' }[lingua] || 'Foto in arrivo';
        media.appendChild(placeholder);
      }

      card.appendChild(body);
      card.appendChild(media);
    } else {
      card.classList.add('item-card--no-media');
      card.appendChild(body);
    }

    container.appendChild(card);
  });

  const bloccoAggiunte = creaBloccoAggiunte(categoria, lingua);
  if (bloccoAggiunte) container.appendChild(bloccoAggiunte);

  // Only the first six cards enter; the rest of a long menu stay immediately readable.
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    const firstCards = [...container.querySelectorAll('.item-card')].slice(0, 6);
    firstCards.forEach((card, index) => {
      card.classList.add('menu-card-pending');
      card.style.setProperty('--menu-enter-delay', `${(index % 2) * 40}ms`);
    });
    menuCardObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const card = entry.target;
        card.classList.remove('menu-card-pending');
        card.classList.add('menu-card-entering');
        card.addEventListener('animationend', () => card.classList.remove('menu-card-entering'), { once: true });
        observer.unobserve(card);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    firstCards.forEach(card => menuCardObserver.observe(card));
  }

  aggiornaSliderBottom(categoria);
}

const SOGLIA_SLIDER_BOTTOM = 4;

function aggiornaSliderBottom(categoria) {
  const wrap = document.querySelector('.menu-tabs-wrap--bottom');
  if (!wrap) return;
  const pochi = categoria.items.length < SOGLIA_SLIDER_BOTTOM;
  wrap.classList.toggle('is-hidden', pochi);
}

function testoNota(item, lingua) {
  if (!item.note) return null;
  if (typeof item.note === 'string') return item.note;
  return item.note[lingua] || item.note.it || null;
}

function creaListaPrezzi(item) {
  const list = document.createElement('ul');
  list.classList.add('item-price-list');
  Object.entries(item.prezzi).forEach(([chiave, valore]) => {
    const row = document.createElement('li');
    row.classList.add('item-price-row');
    const label = document.createElement('span');
    label.classList.add('item-price-row__label');
    label.textContent = etichettaPrezzo(chiave);
    const value = document.createElement('span');
    value.classList.add('item-price-row__value');
    value.textContent = euro(valore);
    row.appendChild(label);
    row.appendChild(value);
    list.appendChild(row);
  });
  return list;
}

function formattaPrezzo(item) {
  if (item.prezzi) {
    return Object.entries(item.prezzi).map(([chiave, valore]) => {
      return `${etichettaPrezzo(chiave)} ${euro(valore)}`;
    }).join(', ');
  }
  return euro(item.prezzo);
}

async function selezionaMacrogruppo(file, btn) {
  const requestId = ++menuRequestId;
  document.querySelectorAll('.macrogruppo').forEach(b => b.classList.toggle('is-loading', b === btn));
  mostraStatoMenu('loading');
  const dati = await caricaMenu(file);
  if (requestId !== menuRequestId) return;
  document.querySelectorAll('.macrogruppo').forEach(b => {
    b.classList.remove('is-loading');
    b.classList.toggle('active', !!dati && b === btn);
    b.setAttribute('aria-pressed', !!dati && b === btn ? 'true' : 'false');
  });
  if (!dati) {
    const previous = document.querySelector(`.macrogruppo[data-file="${menuFileCorrente}"]`);
    if (categorieGlobali && previous) {
      previous.classList.add('active');
      previous.setAttribute('aria-pressed', 'true');
    }
    mostraStatoMenu('error', () => selezionaMacrogruppo(file, btn));
    return;
  }
  menuFileCorrente = file;
  categorieGlobali = dati.categorie;
  filtroTagCorrente = null;
  categoriaCorrente = dati.categorie[0];
  document.getElementById('menu-tabs').replaceChildren();
  document.getElementById('menu-tabs-bottom').replaceChildren();
  creaTabs(dati.categorie);
  mostraPizze(dati.categorie[0]);
  aggiornaIndicatore();
  mostraStatoMenu(null);
}

function init() {
  const btn = document.querySelector('.macrogruppo[data-file="menu-cibo.json"]');
  selezionaMacrogruppo('menu-cibo.json', btn);
}

// fuori da init
document.addEventListener('linguaCambiata', () => {
  aggiornaStatoMenu();
  if (categorieGlobali) {
    document.getElementById('menu-tabs').innerHTML = '';
    document.getElementById('menu-tabs-bottom').innerHTML = '';
    creaTabs(categorieGlobali);
    aggiornaIndicatore();
  }
  if (categoriaCorrente) mostraPizze(categoriaCorrente);
});

document.querySelectorAll('.macrogruppo').forEach(btn => {
  btn.addEventListener('click', () => selezionaMacrogruppo(btn.dataset.file, btn));
});

// Listener per gli indicatori di scroll (top + bottom), una sola volta
(function () {
  const wraps = document.querySelectorAll('.menu-tabs-wrap');
  wraps.forEach(wrap => {
    const tabs = wrap.querySelector('.menu-tabs');
    if (!tabs) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; aggiornaIndicatore(wrap); });
    };
    tabs.addEventListener('scroll', onScroll, { passive: true });
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(() => aggiornaIndicatore(wrap)).observe(tabs);
    }
  });
  window.addEventListener('resize', () => aggiornaIndicatore());
})();

init();
