/* ============================================================
   PIZZERIA AVALON — Avviso temporaneo chiusura per ferie
   ------------------------------------------------------------
   Feature autocontenuta (markup + stile + logica in questo file).

   PER DISATTIVARE a fine ferie:  AVVISO.attivo = false
   PER CAMBIARE LA DATA:          AVVISO.riapertura = "AAAA-MM-GG"
   PER RIMUOVERE DEL TUTTO:       cancella questo file e le righe
                                  <script src="js/avviso.js"></script>

   Si auto-spegne comunque a partire dalla data di riapertura.
   ============================================================ */

(function () {
  const AVVISO = {
    attivo: true,            // metti false a fine ferie per spegnerlo ovunque
    inizio: "2026-06-30",    // compare automaticamente dalle 00:00 di questo giorno
    riapertura: "2026-07-16" // unica fonte della data (giovedì 16 luglio)
  };

  // Etichette per lingua (la data viene formattata a parte via Intl).
  const TESTI = {
    it: { chiusi: "Chiusi per ferie", riapertura: "Riapriamo" },
    fr: { chiusi: "Fermé pour congés", riapertura: "Réouverture" },
    en: { chiusi: "Closed for holidays", riapertura: "Reopening" }
  };

  const LINGUE_SUPPORTATE = ["it", "fr", "en"];
  const LINGUA_DEFAULT = "it";

  // --- Visibilità automatica: compare dalle 00:00 di "inizio" e si spegne
  //     dalle 00:00 di "riapertura", anche se il flag è rimasto a true. ---
  function avvisoVisibile() {
    if (!AVVISO.attivo) return false;
    const adesso = new Date();
    const riapre = new Date(AVVISO.riapertura + "T00:00:00");
    if (adesso >= riapre) return false;
    if (AVVISO.inizio) {
      const parte = new Date(AVVISO.inizio + "T00:00:00");
      if (adesso < parte) return false;
    }
    return true;
  }

  function rilevaLingua() {
    const salvata = localStorage.getItem("lingua");
    if (salvata && LINGUE_SUPPORTATE.includes(salvata)) return salvata;
    const htmlLang = document.documentElement.getAttribute("lang");
    if (htmlLang && LINGUE_SUPPORTATE.includes(htmlLang)) return htmlLang;
    const nav = (navigator.language || "").slice(0, 2);
    if (LINGUE_SUPPORTATE.includes(nav)) return nav;
    return LINGUA_DEFAULT;
  }

  function dataFormattata(lingua) {
    const d = new Date(AVVISO.riapertura + "T00:00:00");
    const fmt = new Intl.DateTimeFormat(lingua, {
      weekday: "long",
      day: "numeric",
      month: "long"
    });
    return fmt.format(d);
  }

  function iniettaStile() {
    if (document.getElementById("avviso-style")) return;
    const style = document.createElement("style");
    style.id = "avviso-style";
    style.textContent = `
      .avviso {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: var(--z-toast, 400);
        background-color: var(--color-red, #B12C16);
        color: var(--color-crema, #FDF6EE);
        font-family: var(--font-heading2, system-ui, sans-serif);
        font-size: var(--text-lg, 1.25rem);
        font-weight: var(--weight-medium, 500);
        line-height: 1.35;
        box-shadow: var(--shadow-md, 0 4px 12px rgba(26,16,8,.10));
        padding-top: env(safe-area-inset-top, 0px);
      }
      .avviso__inner {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-3, 0.75rem);
        text-align: center;
        padding: var(--space-4, 1rem) var(--space-4, 1rem);
        max-width: var(--container-max, 480px);
        margin-inline: auto;
        flex-wrap: wrap;
      }
      .avviso__icon {
        flex: 0 0 auto;
        width: 1.6rem;
        height: 1.6rem;
        stroke: currentColor;
      }
      .avviso__text { display: inline; }
      .avviso__data { font-weight: var(--weight-bold, 700); white-space: nowrap; }

      body.has-avviso { padding-top: var(--avviso-h, 0px); }
      body.has-avviso .lang-switcher {
        top: calc(var(--space-4, 1rem) + var(--avviso-h, 0px));
      }

      /* Desktop: la navbar è in alto, quindi spostiamo il banner in fondo. */
      @media (min-width: 1024px) {
        .avviso {
          top: auto;
          bottom: 0;
          padding-top: 0;
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
        body.has-avviso {
          padding-top: calc(var(--space-5) + var(--nav-height-desktop) + var(--space-3) + env(safe-area-inset-top, 0px));
          padding-bottom: var(--avviso-h, 0px);
        }
        body.home.has-avviso {
          padding-top: env(safe-area-inset-top, 0px);
        }
        body.has-avviso .lang-switcher {
          top: var(--header-bar-top);
        }
      }
    `;
    document.head.appendChild(style);
  }

  function iconaSVG() {
    // Sole (vibe "ferie estive") — icona ufficiale Lucide "sun".
    return `
      <svg class="avviso__icon" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round"
        stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4"></circle>
        <path d="M12 2v2"></path>
        <path d="M12 20v2"></path>
        <path d="m4.93 4.93 1.41 1.41"></path>
        <path d="m17.66 17.66 1.41 1.41"></path>
        <path d="M2 12h2"></path>
        <path d="M20 12h2"></path>
        <path d="m6.34 17.66-1.41 1.41"></path>
        <path d="m19.07 4.93-1.41 1.41"></path>
      </svg>`;
  }

  function aggiornaAltezza(banner) {
    const h = banner.offsetHeight;
    document.documentElement.style.setProperty("--avviso-h", h + "px");
  }

  function renderTesto(banner, lingua) {
    const t = TESTI[lingua] || TESTI[LINGUA_DEFAULT];
    const textEl = banner.querySelector(".avviso__text");
    textEl.innerHTML =
      `${t.chiusi} &middot; ${t.riapertura} ` +
      `<span class="avviso__data">${dataFormattata(lingua)}</span>`;
    requestAnimationFrame(() => aggiornaAltezza(banner));
  }

  function init() {
    if (!avvisoVisibile()) return;

    iniettaStile();

    const banner = document.createElement("div");
    banner.className = "avviso";
    banner.setAttribute("role", "status");
    banner.innerHTML = `<div class="avviso__inner">${iconaSVG()}<span class="avviso__text"></span></div>`;
    document.body.insertBefore(banner, document.body.firstChild);
    document.body.classList.add("has-avviso");

    renderTesto(banner, rilevaLingua());

    document.addEventListener("linguaCambiata", (e) => {
      const lingua = e.detail && e.detail.lingua ? e.detail.lingua : rilevaLingua();
      renderTesto(banner, lingua);
    });

    window.addEventListener("resize", () => aggiornaAltezza(banner));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
