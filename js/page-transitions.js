/* ============================================
   PIZZERIA AVALON — Transizioni tra pagine
   Slide orizzontale direzionale + fade al cambio pagina.
   Direzione basata sull'ordine navbar (avanti / indietro).
   View Transitions API nativa + fallback JS.
   ============================================ */
(function () {
  const PAGES = ['index.html', 'menu.html', 'prenota.html', 'gioca.html'];
  const FLAG = 'avalon-page-transition';
  const DIR_KEY = 'avalon-page-dir';
  const EXIT_MS = 300;
  const NAV_AT_MS = Math.round(EXIT_MS * 0.7);
  const ENTER_SAFETY_MS = EXIT_MS + 80;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  function navDirection(from, to) {
    const fromIdx = PAGES.indexOf(from);
    const toIdx = PAGES.indexOf(to);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return 'forward';
    return toIdx > fromIdx ? 'forward' : 'back';
  }

  function setDirection(dir) {
    document.documentElement.setAttribute('data-page-dir', dir);
    sessionStorage.setItem(DIR_KEY, dir);
    if (dir === 'back') {
      document.documentElement.style.setProperty('--page-out-x', '24px');
      document.documentElement.style.setProperty('--page-in-x', '-24px');
    } else {
      document.documentElement.style.setProperty('--page-out-x', '-24px');
      document.documentElement.style.setProperty('--page-in-x', '24px');
    }
  }

  function slideTargets() {
    return document.querySelectorAll('.page-slide-target');
  }

  function markSlideTargets() {
    document.querySelectorAll('.page-wrapper, body > .hero, body > .footer').forEach((el) => {
      el.classList.add('page-slide-target');
    });
  }

  function afterTransition(callback, safetyMs) {
    const targets = slideTargets();
    if (!targets.length) {
      callback();
      return;
    }

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      callback();
    };

    targets[0].addEventListener('transitionend', finish, { once: true });
    setTimeout(finish, safetyMs);
  }

  function prefetchPage(href) {
    if (!href || document.querySelector('link[data-prefetch="' + href + '"]')) return;
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    link.setAttribute('data-prefetch', href);
    document.head.appendChild(link);
  }

  /* -------- ENTRATA: slide + fade al load ----------- */
  if (!reduceMotion && sessionStorage.getItem(FLAG)) {
    sessionStorage.removeItem(FLAG);

    const reveal = () => {
      markSlideTargets();
      document.documentElement.classList.remove('page-await-enter');
      document.body.classList.add('page-is-entering');

      requestAnimationFrame(() => {
        document.body.classList.add('page-enter-active');
        afterTransition(() => {
          document.body.classList.remove('page-is-entering', 'page-enter-active');
          document.documentElement.removeAttribute('data-page-dir');
          document.documentElement.style.removeProperty('--page-out-x');
          document.documentElement.style.removeProperty('--page-in-x');
          slideTargets().forEach((el) => {
            el.classList.remove('page-slide-target');
            el.style.removeProperty('will-change');
          });
        }, ENTER_SAFETY_MS);
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', reveal, { once: true });
    } else {
      reveal();
    }
  }

  /* -------- NAVIGAZIONE: direzione + uscita animata ----------- */
  function setupNav() {
    if (reduceMotion) return;

    const current = currentPageFile();
    const links = document.querySelectorAll('.navbar a[href]');

    links.forEach((link) => {
      const href = link.getAttribute('href') || '';
      const file = hrefFile(href);
      if (!PAGES.includes(file) || file === current) return;

      link.addEventListener('mouseenter', () => prefetchPage(href), { passive: true });
      link.addEventListener('focusin', () => prefetchPage(href));

      link.addEventListener('click', (e) => {
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
          return;
        }

        if (typeof AvalonGame !== 'undefined' && AvalonGame.isRunning()) {
          AvalonGame.stopForNavigation();
        }

        setDirection(navDirection(current, file));

        e.preventDefault();
        markSlideTargets();
        sessionStorage.setItem(FLAG, '1');

        requestAnimationFrame(() => {
          document.body.classList.add('page-is-leaving');
          setTimeout(() => {
            window.location.href = href;
          }, NAV_AT_MS);
        });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupNav, { once: true });
  } else {
    setupNav();
  }
})();
