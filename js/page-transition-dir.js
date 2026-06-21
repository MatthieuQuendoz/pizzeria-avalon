/* Ripristina o resetta la direzione di navigazione prima del paint. */
(function () {
  var dir = sessionStorage.getItem('avalon-page-dir');
  var root = document.documentElement;

  if (dir === 'forward' || dir === 'back') {
    root.setAttribute('data-page-dir', dir);
    sessionStorage.removeItem('avalon-page-dir');
  } else {
    root.removeAttribute('data-page-dir');
  }

  if (sessionStorage.getItem('avalon-page-transition')) {
    root.classList.add('page-await-enter');
  }

  /* Hero home: intro già vista in questa sessione → niente fade-up al ritorno */
  if (sessionStorage.getItem('avalon-hero-intro')) {
    root.classList.add('hero-intro-done');
  }
})();
