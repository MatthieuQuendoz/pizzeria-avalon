/* Soft opacity dissolve for internal page navigation. */
(function () {
  const PAGES = ['index', 'menu', 'prenota', 'gioca'];
  const FLAG = 'avalon-page-transition';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let leaving = false;
  let entering = false;

  function pageKey(path) {
    const last = (path || '').split('/').filter(Boolean).pop() || '';
    return last.replace(/\.html$/i, '') || 'index';
  }

  function reveal() {
    if (entering) return;
    entering = true;
    document.documentElement.classList.remove('page-await-enter');
    document.body.classList.add('page-is-entering');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.body.classList.add('page-enter-active');
      setTimeout(() => {
        document.body.classList.remove('page-is-entering', 'page-enter-active');
        document.documentElement.removeAttribute('data-page-dir');
      }, 260);
    }));
  }

  if (sessionStorage.getItem(FLAG)) {
    sessionStorage.removeItem(FLAG);
    if (reduceMotion.matches) {
      document.documentElement.classList.remove('page-await-enter');
    } else {
      const ready = () => {
        if (document.readyState === 'complete') reveal();
        else {
          window.addEventListener('load', reveal, { once: true });
          setTimeout(reveal, 450);
        }
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ready, { once: true });
      } else ready();
    }
  }

  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    leaving = false;
    document.body.classList.remove('page-is-leaving');
  });

  document.addEventListener('click', event => {
    if (leaving || reduceMotion.matches || event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    const from = pageKey(window.location.pathname);
    const to = pageKey(url.pathname);
    if (!PAGES.includes(to) || to === from) return;

    event.preventDefault();
    leaving = true;
    if (typeof AvalonGame !== 'undefined' && AvalonGame.isRunning()) {
      AvalonGame.stopForNavigation();
    }
    sessionStorage.setItem(FLAG, '1');
    document.body.classList.add('page-is-leaving');

    let navigated = false;
    const navigate = () => {
      if (navigated) return;
      navigated = true;
      window.location.assign(url.href);
    };
    document.body.addEventListener('transitionend', event => {
      if (event.target === document.body && event.propertyName === 'opacity') navigate();
    }, { once: true });
    setTimeout(navigate, 190);
  });
})();
