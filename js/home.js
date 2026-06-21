// Segna l'intro hero come vista: al prossimo ritorno sulla home il titolo resta statico.
(function () {
  const KEY = 'avalon-hero-intro';
  if (sessionStorage.getItem(KEY)) return;

  sessionStorage.setItem(KEY, '1');
})();
