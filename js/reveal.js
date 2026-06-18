// Scroll reveal condiviso.
// Rivela gli elementi [data-reveal] quando entrano nel viewport (una volta sola).
// Rispetta prefers-reduced-motion e degrada con grazia se IntersectionObserver manca.
(function () {
  const prefersReduced =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const supportsObserver = 'IntersectionObserver' in window;

  function revealNow(el) {
    el.classList.add('is-visible');
  }

  let observer = null;
  if (!prefersReduced && supportsObserver) {
    observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            revealNow(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.1 }
    );
  }

  function register(root) {
    const scope = root || document;
    const targets = scope.querySelectorAll('[data-reveal]:not(.is-visible)');
    targets.forEach(el => {
      if (observer) {
        observer.observe(el);
      } else {
        revealNow(el);
      }
    });
  }

  // Ri-registra elementi creati dinamicamente (es. card menu).
  window.revealRefresh = register;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => register());
  } else {
    register();
  }
})();
