/* Ripristina o resetta la direzione di navigazione prima del paint. */
(function () {
  var dir = sessionStorage.getItem('avalon-page-dir');
  var root = document.documentElement;

  if (dir === 'forward' || dir === 'back') {
    root.setAttribute('data-page-dir', dir);
    if (dir === 'back') {
      root.style.setProperty('--page-out-x', '24px');
      root.style.setProperty('--page-in-x', '-24px');
    }
    sessionStorage.removeItem('avalon-page-dir');
  } else {
    root.removeAttribute('data-page-dir');
    root.style.removeProperty('--page-out-x');
    root.style.removeProperty('--page-in-x');
  }

  if (sessionStorage.getItem('avalon-page-transition')) {
    root.classList.add('page-await-enter');
  }
})();
