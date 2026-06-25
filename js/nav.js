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
