/* Internal navigation: immediate departure, one short arrival animation. */
(function () {
  const PAGES = ['index', 'menu', 'prenota', 'gioca'];
  const FLAG = 'avalon-page-transition';
  const DIR_KEY = 'avalon-page-dir';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function pageKey(path) {
    const last = (path || '').split('/').filter(Boolean).pop() || '';
    return last.replace(/\.html$/i, '') || 'index';
  }

  function markSlideTargets() {
    const homeRoot = document.querySelector('.page-slide-root');
    if (homeRoot) {
      homeRoot.classList.add('page-slide-target');
      document.querySelector('body > .footer')?.classList.add('page-slide-target');
    } else {
      document.querySelectorAll('.page-wrapper, body > .hero, body > .footer')
        .forEach(el => el.classList.add('page-slide-target'));
    }
  }

  function transitionMs() {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--page-transition-duration').trim();
    return Number.parseFloat(raw) || 240;
  }

  if (!reduceMotion.matches && sessionStorage.getItem(FLAG)) {
    sessionStorage.removeItem(FLAG);
    const enter = () => {
      markSlideTargets();
      document.body.classList.add('page-is-entering');
      document.documentElement.classList.remove('page-await-enter');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        document.body.classList.add('page-enter-active');
        let finished = false;
        const finish = () => {
          if (finished) return;
          finished = true;
          document.body.classList.remove('page-is-entering', 'page-enter-active');
          document.documentElement.removeAttribute('data-page-dir');
          document.querySelectorAll('.page-slide-target')
            .forEach(el => el.classList.remove('page-slide-target'));
        };
        const target = document.querySelector('.page-slide-target');
        target?.addEventListener('transitionend', finish, { once: true });
        setTimeout(finish, transitionMs() + 100);
      }));
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', enter, { once: true });
    } else {
      enter();
    }
  }

  // A delegated handler also covers links created later and links outside the navbar.
  document.addEventListener('click', event => {
    if (reduceMotion.matches || event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    const from = pageKey(window.location.pathname);
    const to = pageKey(url.pathname);
    if (!PAGES.includes(to) || to === from) return;

    if (typeof AvalonGame !== 'undefined' && AvalonGame.isRunning()) {
      AvalonGame.stopForNavigation();
    }
    sessionStorage.setItem(DIR_KEY, PAGES.indexOf(to) > PAGES.indexOf(from) ? 'forward' : 'back');
    sessionStorage.setItem(FLAG, '1');
    // Let the browser follow the link immediately, including keyboard activation.
  });
})();
