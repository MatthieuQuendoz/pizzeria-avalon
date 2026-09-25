/* Set cross-page state before the browser paints the destination. */
(function () {
  var root = document.documentElement;
  if (sessionStorage.getItem('avalon-page-transition')) {
    root.classList.add('page-await-enter');
    /* Do not leave a blank destination if a later script fails. */
    setTimeout(function () { root.classList.remove('page-await-enter'); }, 2000);
  }
  if (sessionStorage.getItem('avalon-hero-intro')) {
    root.classList.add('hero-intro-done');
  }
})();
