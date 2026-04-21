let categoriaCorrente = null;
let categorieGlobali = null; 


async function caricaMenu() {
  // carica data/menu.json
  // ritorna i dati
  try {
    const response = await fetch('data/menu.json');
    const dati = await response.json();
    return dati;
  } catch (error) {
    console.error('Errore nel caricamento del file:', error);
    return null;
  }
}

function creaTabs(categorie) {
  const tabsContainer = document.getElementById('menu-tabs');
  
  categorie.forEach((categoria, index) => {
    const tab = document.createElement('button');
    tab.classList.add('menu-tab');
    if (index === 0) tab.classList.add('active'); // attiva la prima tab di default
    const lingua = localStorage.getItem('lingua') || 'it';
    tab.textContent = categoria.nome[lingua] || categoria.nome.it;
    
    tab.addEventListener('click', () => {
      // rimuovi classe active da tutte le tab
      document.querySelectorAll('.menu-tab').forEach(t => t.classList.remove('active'));
      // aggiungi classe active alla tab cliccata
      tab.classList.add('active');
      // mostra le pizze della categoria cliccata
      mostraPizze(categoria);
    });
    
    tabsContainer.appendChild(tab);
  });
}



function mostraPizze(categoria) {
  categoriaCorrente = categoria; // ← aggiungi questa riga

  const container = document.getElementById('menu-lista');
  container.innerHTML = ''; // pulisce il contenuto precedente
  
  categoria.pizze.forEach(pizza => {
    const card = document.createElement('div');
    card.classList.add('pizza-card');
    
    const img = document.createElement('img');
    img.src = pizza.immagine;
    img.alt = pizza.nome;
    
    const nome = document.createElement('h3');
    nome.textContent = pizza.nome;
    
    const descrizione = document.createElement('p');
    const lingua = localStorage.getItem('lingua') || 'it';
    descrizione.textContent = pizza.descrizione[lingua] || pizza.descrizione.it;
    
    const prezzo = document.createElement('span');
    prezzo.textContent = `€ ${pizza.prezzo.toFixed(2)}`;
    
    card.appendChild(img);
    card.appendChild(nome);
    card.appendChild(descrizione);
    card.appendChild(prezzo);
    
    container.appendChild(card);
  });
}


async function init() {
  const dati = await caricaMenu();
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

init();