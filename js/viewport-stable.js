/* Compensa la UI del browser mobile (barra indirizzi) per evitare salti
   della navbar fissa in basso durante lo scroll. Solo sotto 1024px. */
(function () {
  'use strict';

  const DESKTOP = window.matchMedia('(min-width: 1024px)');
  let rafId = 0;

  function update() {
    rafId = 0;
    const root = document.documentElement;

    if (DESKTOP.matches || !window.visualViewport) {
      root.style.removeProperty('--browser-chrome-bottom');
      return;
    }

    const vv = window.visualViewport;
    /* Spazio tra il bordo inferiore del viewport visivo e quello del layout:
       quando la barra indirizzi è visibile è > 0; quando si nascollo → 0.
       Sommandolo a `bottom` la navbar resta alla stessa posizione sullo schermo. */
    const chromeBottom = Math.max(0, window.innerHeight - vv.offsetTop - vv.height);
    root.style.setProperty('--browser-chrome-bottom', `${chromeBottom}px`);
  }

  function schedule() {
    if (rafId) return;
    rafId = requestAnimationFrame(update);
  }

  function init() {
    if (!window.visualViewport) return;
    update();
    window.visualViewport.addEventListener('resize', schedule, { passive: true });
    window.visualViewport.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('orientationchange', schedule, { passive: true });
    DESKTOP.addEventListener('change', update);
  }

  init();
})();
