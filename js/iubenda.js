var IUBENDA_CS_WIDGET = '1e3d3707-fe99-4f69-9752-2f4ad9fa1655';

window.addEventListener('load', function () {
  var s = document.createElement('script');
  s.src = 'https://embeds.iubenda.com/widgets/' + IUBENDA_CS_WIDGET + '.js';
  s.async = true;
  document.head.appendChild(s);
}, { once: true });

(function (w) {
  function loadIubendaEmbeds() {
    var s = document.createElement('script');
    s.src = 'https://cdn.iubenda.com/iubenda.js';
    s.async = true;
    document.head.appendChild(s);
  }
  if ('requestIdleCallback' in w) {
    w.requestIdleCallback(loadIubendaEmbeds, { timeout: 2000 });
  } else {
    w.addEventListener('load', loadIubendaEmbeds, { once: true });
  }
})(window);
