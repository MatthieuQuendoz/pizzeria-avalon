# Pizzeria Avalon — Guida per Claude

## Stack e architettura

**Vanilla HTML/CSS/JS — zero framework, zero build tools.**

- 4 pagine HTML statiche: `index.html`, `menu.html`, `prenota.html`, `gioca.html`
- Nessun `package.json`, `node_modules`, bundler o transpiler
- Deploy: qualsiasi hosting statico (Netlify, Vercel, GitHub Pages, FTP)
- Per testare in locale: `python3 -m http.server 8000` dalla root del progetto

---

## Struttura file

```
pizzeriaAvalon/
├── index.html              # Home (hero, orari, location)
├── menu.html               # Menu dinamico da JSON
├── prenota.html            # Prenotazioni (Guestplan widget)
├── gioca.html              # Mini-game "L'Acchiappa Pizze" (Canvas 2D)
├── css/
│   ├── tokens.css          # Design tokens (colori, font, spazi, ombre)
│   ├── base.css            # Reset + navbar + footer + lang switcher
│   ├── home.css
│   ├── menu.css
│   ├── prenota.css
│   └── gioca.css
├── js/
│   ├── i18n.js             # Sistema multilingua
│   ├── nav.js              # Navbar attiva
│   ├── home.js             # (vuoto — non usato)
│   ├── menu.js             # Carica e renderizza JSON menu
│   ├── prenota.js          # Solo listener i18n
│   ├── gioca.js            # Orchestrazione gioco
│   ├── gioca-game.js       # Canvas 2D game engine (972 righe)
│   └── gioca-leaderboard.js # Leaderboard localStorage
├── data/
│   ├── menu-cibo.json
│   ├── menu-bevande.json
│   ├── menu-dolci.json
│   └── i18n/
│       ├── it.json
│       ├── fr.json
│       └── en.json
└── assets/
    ├── images/             # hero.png, menu-header.png, AvalonDaFuori.jpg
    └── game/               # knight.png, spritesheet.png, spritesheet.json
```

---

## Design System (tokens.css)

### Colori principali
```css
--color-red: #B12C16        /* rosso brand — CTA, titoli em, link attivi */
--color-green: #3F6833      /* verde — bottone WhatsApp */
--color-brown: #2D1D1D      /* testo body */
--color-lightRed: #FFF0EE   /* sfondo navbar, sezione orari */
--color-crema: #FDF6EE      /* sfondo footer */
--color-lightGreen: #BDEDAA /* tab attivi nel menu */
```

### Font (Google Fonts)
- `Aleo` — titoli hero
- `Source Serif 4` — intestazioni sezioni
- `Epilogue` — body, bottoni, UI

### Bottoni disponibili
```css
.btn.btn-primary    /* rosso */
.btn.btn-secondary  /* outline */
.btn.btn-verde      /* verde WhatsApp */
```

---

## Sistema multilingua

**Lingue:** IT (default), FR, EN

### Come funziona
1. I file di testo sono in `data/i18n/it.json`, `fr.json`, `en.json`
2. Gli elementi HTML hanno attributo `data-i18n="chiave.sottochiave"`
3. `js/i18n.js` carica il JSON e applica le traduzioni al DOM

### Modificare un testo
Edita la stessa chiave in tutti e 3 i file JSON (`it.json`, `fr.json`, `en.json`).

### Aggiungere una nuova stringa
1. Aggiungi la chiave in `data/i18n/it.json`, `fr.json`, `en.json`
2. Aggiungi `data-i18n="tua.chiave"` all'elemento HTML

---

## Menu — come modificare i dati

I file JSON sono in `data/`:
- `menu-cibo.json` — pizze, antipasti, menu bimbi, calzoni
- `menu-bevande.json` — birre, vini, bibite, aperitivi
- `menu-dolci.json` — pizze dolci, affogati, gelati

### Struttura item
```json
{
  "nome": "Margherita",
  "immagine": null,
  "descrizione": {
    "it": "Pomodoro, mozzarella, basilico",
    "fr": "Tomate, mozzarella, basilic",
    "en": "Tomato, mozzarella, basil"
  },
  "prezzo": 7.00,
  "tag": ["Classica", "vegetariana"]
}
```

Per prezzi multipli (piccola/grande) usa `"prezzi": { "piccola": 8.50, "grande": 10.50 }` invece di `"prezzo"`.

### Aggiungere una foto al menu
Sostituire `"immagine": null` con il percorso relativo:
```json
"immagine": "assets/images/menu/margherita.jpg"
```
Le immagini devono essere ottimizzate (jpg/webp, max 200-300 KB, ~600×400px).

### Tag disponibili
`vegan`, `vegetariana`, `piccante`, `immodificabile`, `senza glutine`, `locale`, `Classica`, `new`, `dedicata`, `mangioni`

---

## Gioco — "L'Acchiappa Pizze"

File: `js/gioca-game.js` (Canvas 2D puro, 972 righe)

- Canvas: 390×600px
- Tutto generato proceduralmente (nessun file audio, sfondo procedurale)
- Solo asset esterno: `assets/game/knight.png` (spritesheet cavaliere)
- Audio: Web Audio API (sine/triangle/noise wave generati)

Funzioni principali:
- `drawSky()` / `drawBackground()` / `drawCastle()` — sfondo procedurale
- `drawKnight()` — sprite animato (run/catch/dead)
- `drawPizza()` / `drawBomb()` — oggetti gioco
- `updateDifficulty()` — progressione difficoltà

---

## Integrazioni esterne

| Servizio | Scopo | Config |
|----------|-------|--------|
| **Guestplan** | Widget prenotazioni | `accessKey: c04fdf69efddaa09950f532db39a37d97f39cc51` |
| **Iubenda** | Cookie / Privacy policy | Widget ID: `1e3d3707-fe99-4f69-9752-2f4ad9fa1655` |
| **Lucide Icons** | Icone SVG | CDN `unpkg.com/lucide` |
| **Google Fonts** | Aleo, Source Serif 4, Epilogue | CDN googleapis.com |
| **Google Maps** | Link localizzazione | Query: `Etral+8+Jovençan` |
| **WhatsApp** | Contatto diretto | `wa.me/393514226610` |

---

## Checklist pre-lancio

Vedere il piano completo in `.claude/plans/allora-aiutami-a-trovare-foamy-clover.md`

**In sintesi:**
- [ ] Fotografare le pizze e integrarle nei JSON
- [ ] Restyling home page e navbar/footer
- [ ] Correzioni artistiche gioco (sfondo, sprite, stile brand)
- [ ] Favicon mancante
- [ ] Meta tags SEO nelle 4 pagine
- [ ] Verificare Guestplan + Iubenda su dominio reale
- [ ] Scegliere hosting e deployare
