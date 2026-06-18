let categoriaCorrente = null;
let categorieGlobali = null;
let menuFileCorrente = 'menu-cibo.json';
let filtroTagCorrente = null;

const TAG_CONFIG = {
  'vegan': { emoji: '🌱', label: { it: 'Vegan', fr: 'Végane', en: 'Vegan' } },
  'vegetariana': { emoji: '🥗', label: { it: 'Vegetariana', fr: 'Végétarienne', en: 'Vegetarian' } },
  'piccante': { emoji: '🌶️', label: { it: 'Piccante', fr: 'Épicé', en: 'Spicy' } },
  'immodificabile': { emoji: '🔒', label: { it: 'Immodificabile', fr: 'Fixe', en: 'Fixed' } },
  'senza glutine': { emoji: '🌾', label: { it: 'Senza glutine', fr: 'Sans gluten', en: 'Gluten-free' } },
  'locale': { emoji: '🏔️', label: { it: 'Locale', fr: 'Local', en: 'Local' } },
  'Classica': { emoji: '🎩', label: { it: 'Classica', fr: 'Classique', en: 'Classic' } },
  'new': { emoji: '✨', label: { it: 'Nuovo', fr: 'Nouveau', en: 'New' } }
};

const FILTRO_LABELS = {
  filtra: { it: 'Filtra', fr: 'Filtrer', en: 'Filter' },
  filtraPer: { it: 'Filtra per', fr: 'Filtrer par', en: 'Filter by' },
  tutte: { it: 'Tutte', fr: 'Toutes', en: 'All' }
};


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

//Questa funziona prende i dati da menu.json
async function caricaMenu(file) {
  try {
    const response = await fetch('data/' + file);
    const dati = await response.json();
    return dati;
  } catch (error) {
    console.error('Errore nel caricamento del file:', error);
    return null;
  }
}


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
      if (index === 0) tab.classList.add('active');
      tab.textContent = categoria.nome[lingua] || categoria.nome.it;

      tab.addEventListener('click', () => {
        // Sincronizza active su tutti i tab (top + bottom) con lo stesso indice
        document.querySelectorAll('.menu-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll(`.menu-tab[data-tab-index="${index}"]`).forEach(t => t.classList.add('active'));
        // Scroll in-view del tab corrispondente nella barra superiore
        const topTab = document.querySelector(`#menu-tabs .menu-tab[data-tab-index="${index}"]`);
        topTab?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        // Se il click viene dallo slider in fondo, riporta la pagina in cima alla lista
        if (tab.closest('#menu-tabs-bottom')) {
          document.getElementById('menu-tabs-wrap')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        filtroTagCorrente = null;
        mostraPizze(categoria);
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
      price.textContent = `€ ${aggiunta.prezzo.toFixed(2)}`;
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
  toggle.setAttribute('aria-haspopup', 'true');
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
  chipTutte.textContent = L(FILTRO_LABELS.tutte);
  chipTutte.addEventListener('click', () => applica(null));
  lista.appendChild(chipTutte);

  tags.forEach(tag => {
    const config = TAG_CONFIG[tag];
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.classList.add('menu-filtro', `menu-filtro--${tag.replace(/\s+/g, '-')}`);
    if (filtroTagCorrente === tag) chip.classList.add('active');
    chip.textContent = `${config.emoji} ${L(config.label)}`;
    // Toggle: riclic sullo stesso tag azzera il filtro
    chip.addEventListener('click', () => applica(filtroTagCorrente === tag ? null : tag));
    lista.appendChild(chip);
  });

  panel.appendChild(lista);

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const apri = !container.classList.contains('is-open');
    container.classList.toggle('is-open', apri);
    toggle.setAttribute('aria-expanded', apri ? 'true' : 'false');
    panel.hidden = !apri;
  });

  container.append(toggle, panel);

  // Rigenera l'icona Lucide appena inserita
  if (window.lucide) lucide.createIcons();
}

// Chiude il menu filtri cliccando fuori
document.addEventListener('click', (e) => {
  const container = document.getElementById('menu-filtri');
  if (!container || !container.classList.contains('is-open')) return;
  if (container.contains(e.target)) return;
  container.classList.remove('is-open');
  const toggle = container.querySelector('.menu-filtri__toggle');
  const panel = container.querySelector('.menu-filtri__panel');
  toggle?.setAttribute('aria-expanded', 'false');
  if (panel) panel.hidden = true;
});

function mostraPizze(categoria) {
  categoriaCorrente = categoria;

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
      placeholder.textContent = '🍕';
      media.appendChild(placeholder);
    }

    card.appendChild(body);
    card.appendChild(media);
    container.appendChild(card);
  });

  const bloccoAggiunte = creaBloccoAggiunte(categoria, lingua);
  if (bloccoAggiunte) container.appendChild(bloccoAggiunte);

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
    label.textContent = chiave;
    const value = document.createElement('span');
    value.classList.add('item-price-row__value');
    value.textContent = `€ ${valore.toFixed(2)}`;
    row.appendChild(label);
    row.appendChild(value);
    list.appendChild(row);
  });
  return list;
}

function formattaPrezzo(item) {
  if (item.prezzi) {
    return Object.entries(item.prezzi).map(([chiave, valore]) => {
      return `${chiave} € ${valore.toFixed(2)}`;
    }).join(', ');
  }
  return `€ ${item.prezzo.toFixed(2)}`;
}

//se carica menu caricava il file json init cosa fa di preciso il render?
async function init() {
  menuFileCorrente = 'menu-cibo.json';
  const dati = await caricaMenu('menu-cibo.json')
  if (!dati) return;
  categorieGlobali = dati.categorie;
  creaTabs(dati.categorie);
  mostraPizze(dati.categorie[0]);
  aggiornaIndicatore();
}

// fuori da init
document.addEventListener('linguaCambiata', () => {
  if (categorieGlobali) {
    document.getElementById('menu-tabs').innerHTML = '';
    document.getElementById('menu-tabs-bottom').innerHTML = '';
    creaTabs(categorieGlobali);
    aggiornaIndicatore();
  }
  if (categoriaCorrente) mostraPizze(categoriaCorrente);
});

document.querySelectorAll('.macrogruppo').forEach(btn => {
  btn.addEventListener('click', async () => {
    document.querySelectorAll('.macrogruppo').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const file = btn.dataset.file;
    menuFileCorrente = file;
    const dati = await caricaMenu(file);
    if (!dati) return;
    categorieGlobali = dati.categorie;
    filtroTagCorrente = null;
    document.getElementById('menu-tabs').innerHTML = '';
    document.getElementById('menu-tabs-bottom').innerHTML = '';
    creaTabs(dati.categorie);
    mostraPizze(dati.categorie[0]);
    aggiornaIndicatore();
  });
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