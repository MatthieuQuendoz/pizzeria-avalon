let categoriaCorrente = null;
let categorieGlobali = null;


//Questa funziona prende i dati da menu.json
async function caricaMenu(file) {
  try {
    const response = await fetch('data/' + file);
    const dati = await response.json();
    return dati;
  } catch (error) {
    console.error('Errore nel caricamento del file:', error);
    return null;
  }
}


function creaTabs(categorie) {
  const tabsContainer = document.getElementById('menu-tabs');

  //non mi è chiato da dove arriva "categorie" viene chiamato del file json e sono tutte le categorie delle pizze ogne categoria ha il tipo e un index?
  categorie.forEach((categoria, index) => {

    //crea una elemento button e ad ogni bottone aggiunge la classe menu-tab
    const tab = document.createElement('button');
    tab.classList.add('menu-tab');

    //se l'indice è 0 allora aggiunge la classe active
    if (index === 0) tab.classList.add('active'); // attiva la prima tab di default
    const lingua = localStorage.getItem('lingua') || 'it';
    tab.textContent = categoria.nome[lingua] || categoria.nome.it;

    tab.addEventListener('click', () => {
      // rimuovi classe active da tutte le tab
      document.querySelectorAll('.menu-tab').forEach(t => t.classList.remove('active'));
      // aggiungi classe active alla tab cliccata
      tab.classList.add('active');

      tab.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
      // mostra le pizze della categoria cliccata
      mostraPizze(categoria);
    });

    //cosa fa appendCHild??
    tabsContainer.appendChild(tab);
  });
}



function mostraPizze(categoria) {
  categoriaCorrente = categoria; // ← aggiungi questa riga


  const container = document.getElementById('menu-lista');
  container.innerHTML = ''; // pulisce il contenuto precedente

  categoria.items.forEach(item => {
    const card = document.createElement('div');
    card.classList.add('item-card');


    //Qua popola la card con createElement che aggiunge elementi nell'html in loop per ogni elemento
    const img = document.createElement('img');
    if (item.immagine) {
      img.src = item.immagine;
      img.alt = item.nome;
    } else {
      img.classList.add('img-placeholder');
      img.alt = '';
    }
    card.appendChild(img);

    const nome = document.createElement('h3');
    nome.textContent = item.nome;

    const descrizione = document.createElement('p');
    const lingua = localStorage.getItem('lingua') || 'it';
    descrizione.textContent = item.descrizione[lingua] || item.descrizione.it;

    const prezzo = document.createElement('span');
    prezzo.textContent = formattaPrezzo(item);

    card.appendChild(img);
    card.appendChild(nome);
    card.appendChild(descrizione);
    card.appendChild(prezzo);

    container.appendChild(card);
  });
}


function formattaPrezzo(item) {
  if (item.prezzi) {
    // ha prezzi multipli — scorri l'oggetto e costruisci una stringa
    // hint: Object.entries(item.prezzi) restituisce array di [chiave, valore]
    return Object.entries(item.prezzi).map(([chiave, valore]) => {
      return `${chiave} € ${valore.toFixed(2)}`;
    }).join(', ');
  }
  // prezzo singolo
  return `€ ${item.prezzo.toFixed(2)}`;
}

//se carica menu caricava il file json init cosa fa di preciso il render?
async function init() {
  //Questo mi sembra un passaggio suprefluo. sta rifacendo la stessa cosa di carica menu
  const dati = await caricaMenu('menu-cibo.json')
  if (!dati) return;
  categorieGlobali = dati.categorie;
  creaTabs(dati.categorie);
  mostraPizze(dati.categorie[0]);
}

// fuori da init
document.addEventListener('linguaCambiata', () => {
  if (categorieGlobali) {
    document.getElementById('menu-tabs').innerHTML = '';
    creaTabs(categorieGlobali);
  }
  if (categoriaCorrente) mostraPizze(categoriaCorrente);
});

document.querySelectorAll('.macrogruppo').forEach(btn => {
  btn.addEventListener('click', async () => {
    document.querySelectorAll('.macrogruppo').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const file = btn.dataset.file;
    const dati = await caricaMenu(file);
    if (!dati) return;
    categorieGlobali = dati.categorie;
    document.getElementById('menu-tabs').innerHTML = '';
    creaTabs(dati.categorie);
    mostraPizze(dati.categorie[0]);
  });
});

init();