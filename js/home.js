// Segna l'intro hero come vista: al prossimo ritorno sulla home il titolo resta statico.
(function () {
  const KEY = 'avalon-hero-intro';
  if (sessionStorage.getItem(KEY)) return;

  sessionStorage.setItem(KEY, '1');
})();

// La selezione usa gli stessi prezzi, foto e ingredienti del menu.
(async function () {
  const container = document.getElementById('home-pizzas');
  if (!container) return;
  let selected = [];
  let current = 0;
  const controls = document.getElementById('home-carousel-controls');
  const previous = document.getElementById('pizza-prev');
  const next = document.getElementById('pizza-next');
  const position = document.getElementById('pizza-position');
  const mobile = matchMedia('(max-width: 1023px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const labels = {
    it: { previous: 'Pizza precedente', next: 'Pizza successiva' },
    fr: { previous: 'Pizza précédente', next: 'Pizza suivante' },
    en: { previous: 'Previous pizza', next: 'Next pizza' }
  };
  function updateControls() {
    position.textContent = (current + 1) + ' / ' + selected.length;
    previous.disabled = current === 0;
    next.disabled = current === selected.length - 1;
  }
  function goTo(index, smooth = true) {
    current = Math.max(0, Math.min(selected.length - 1, index));
    const card = container.children[current];
    if (card) {
      const left = mobile.matches ? card.offsetLeft - container.children[0].offsetLeft : 0;
      container.scrollTo({ left, behavior: smooth && !reducedMotion.matches ? 'smooth' : 'auto' });
    }
    updateControls();
  }
  previous.addEventListener('click', () => goTo(current - 1));
  next.addEventListener('click', () => goTo(current + 1));
  container.addEventListener('keydown', (event) => {
    if (!mobile.matches || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    goTo(event.key === 'Home' ? 0 : event.key === 'End' ? selected.length - 1 : current + (event.key === 'ArrowRight' ? 1 : -1));
  });
  let scrollFrame = 0;
  container.addEventListener('scroll', () => {
    if (scrollFrame || !mobile.matches) return;
    scrollFrame = requestAnimationFrame(() => {
      const step = container.children[1]?.offsetLeft - container.children[0]?.offsetLeft;
      if (step) current = Math.max(0, Math.min(selected.length - 1, Math.round(container.scrollLeft / step)));
      updateControls();
      scrollFrame = 0;
    });
  }, { passive: true });
  new ResizeObserver(() => goTo(current, false)).observe(container);
  function render() {
    const lang = document.documentElement.lang || 'it';
    const local = labels[lang] || labels.it;
    previous.setAttribute('aria-label', local.previous);
    next.setAttribute('aria-label', local.next);
    container.replaceChildren();
    selected.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'home-pizza';
      const body = document.createElement('div');
      body.className = 'home-pizza__body';
      const photo = document.createElement('div');
      photo.className = 'home-pizza__photo';
      const img = document.createElement('img');
      img.src = item.immagine;
      img.alt = item.nome;
      img.width = 400;
      img.height = 400;
      img.loading = 'lazy';
      img.decoding = 'async';
      photo.append(img);
      const title = document.createElement('h3');
      title.textContent = item.nome;
      const price = document.createElement('span');
      price.className = 'home-pizza__price';
      price.textContent = new Intl.NumberFormat(lang, { style: 'currency', currency: 'EUR' }).format(item.prezzo);
      const description = document.createElement('p');
      description.className = 'home-pizza__description';
      description.textContent = item.descrizione[lang] || item.descrizione.it;
      body.append(title, description, price);
      card.append(body, photo);
      container.append(card);
    });
    container.hidden = selected.length === 0;
    controls.hidden = selected.length < 2;
    if (selected.length) goTo(current, false);
  }
  new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  try {
    const response = await fetch('data/menu-cibo.json');
    if (!response.ok) throw new Error('Menu unavailable');
    const data = await response.json();
    const items = data.categorie.flatMap(category => category.items);
    selected = ['Delizia', 'Avalon', 'Tag Hot', 'Toro seduto', 'Miseria nobiltà', 'Mia']
      .map(name => items.find(item => item.nome === name))
      .filter(Boolean);
    render();
  } catch (error) {
    // Il collegamento al menu resta disponibile anche senza dati.
    console.warn('Selezione pizze non disponibile', error);
  }
})();
