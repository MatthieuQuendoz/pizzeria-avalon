/* Evidenzia il link della navbar corrispondente alla pagina corrente. */
(function () {
  const nav = document.querySelector('.nav-links');
  if (!nav) return;

  const page = currentPageFile();

  nav.querySelectorAll('a[href]').forEach((link) => {
    const file = hrefFile(link.getAttribute('href'));
    if (!file) return;
    link.classList.toggle('active', file === page);
  });

  function currentPageFile() {
    return pageKey(window.location.pathname);
  }

  function hrefFile(href) {
    return pageKey((href || '').split('?')[0].split('#')[0]);
  }

  // Normalizza path o href in una chiave pagina senza estensione.
  // "/" o "/index.html" -> "index"; "/menu" o "/menu.html" -> "menu".
  function pageKey(path) {
    const last = (path || '').split('/').filter(Boolean).pop() || '';
    const file = last.replace(/\.html$/i, '');
    return file || 'index';
  }
})();

/* Sulle pagine con hero fotografica la barra diventa opaca quando la foto
   non fornisce più un fondo leggibile. */
(function () {
  const hero = document.querySelector('.hero, .menu-hero, .prenota-hero, .gioca-hero');
  const navbar = document.querySelector('.navbar');
  if (!hero || !navbar) return;

  let scheduled = false;
  function update() {
    const scrolled = hero.getBoundingClientRect().bottom <
      navbar.getBoundingClientRect().bottom + 180;
    document.body.classList.toggle('site-scrolled', scrolled);
    document.body.classList.toggle('home-scrolled', scrolled && document.body.classList.contains('home'));
    scheduled = false;
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('pageshow', schedule);
  update();
})();
