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
    const parts = window.location.pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    if (!last || !last.includes('.')) return 'index.html';
    return last;
  }

  function hrefFile(href) {
    const path = (href || '').split('?')[0].split('#')[0];
    const file = path.split('/').filter(Boolean).pop();
    return file || 'index.html';
  }
})();
