// =============================================================
//  📦 IMPORTAZIONE MODULI
//  Qui diciamo a Node.js quali "strumenti" vogliamo usare
// =============================================================

const express = require("express");                 // Express: il framework per il server web
const bodyParser = require("body-parser");          // Legge i dati inviati dai form
const session = require("express-session");         // Gestisce le sessioni (login utente)
const ejsLayouts = require("express-ejs-layouts");  // Permette di avere header/footer comuni
const fs = require("fs");                           // Legge e scrive file sul disco
const path = require("path");                       // Aiuta a costruire percorsi di file

// =============================================================
//  🚀 CREAZIONE DEL SERVER
//  Creiamo il server e diciamo su quale porta ascoltare
// =============================================================

const app  = express();   // Creiamo l'applicazione Express
const PORT = 3000;        // Il server risponderà su http://localhost:3000

// =============================================================
//  ⚙️ CONFIGURAZIONE DEL SERVER
//  Qui impostiamo tutte le opzioni di base
// =============================================================

// Usiamo EJS come linguaggio per le pagine HTML dinamiche
app.set("view engine", "ejs");

// Diciamo a Express dove si trovano le nostre pagine (.ejs)
app.set("views", path.join(__dirname, "views"));

// Attiviamo i layout (un unico file ha header e footer per tutte le pagine)
app.use(ejsLayouts);
app.set("layout", "layout"); // Il file di layout si chiama "layout.ejs"

// Rendiamo accessibili i file statici (CSS, immagini, JS) dalla cartella "public"
app.use(express.static(path.join(__dirname, "public")));

// Diciamo al server come leggere i dati inviati dai form HTML
app.use(bodyParser.urlencoded({ extended: true })); // Per i form normali
app.use(bodyParser.json());                         // Per i dati in formato JSON

// Configuriamo le sessioni: tengono traccia di chi è loggato
app.use(session({
  secret: "parola-segreta-super-sicura", // Parola segreta per proteggere il cookie
  resave: false,            // Non salva la sessione se non cambia nulla
  saveUninitialized: false  // Non crea sessioni per chi non è loggato
}));

// =============================================================
//  📁 PERCORSI AI FILE DATABASE (JSON)
//  Usiamo file JSON come database semplice (niente MySQL!)
// =============================================================

const FILE_UTENTI = path.join(__dirname, "data", "users.json");   // Lista utenti
const FILE_FILM   = path.join(__dirname, "data", "movies.json");  // Lista film

// =============================================================
//  🛠️ FUNZIONI UTILI
//  Funzioni helper che usiamo più volte nel codice
// =============================================================

// ----------------------------------------------------------
// FUNZIONE: leggi i dati da un file JSON
// Restituisce i dati come array. Se il file non esiste, restituisce []
// ----------------------------------------------------------
function leggiFile(percorso) {
  // Se il file non esiste, restituiamo un array vuoto
  if (!fs.existsSync(percorso)) {
    return [];
  }

  try {
    var contenuto = fs.readFileSync(percorso, "utf8"); // Legge il file
    return JSON.parse(contenuto);                       // Converte il testo JSON in oggetto JS
  } catch (errore) {
    console.error("Errore lettura file:", errore);
    return []; // Se c'è un errore, restituiamo comunque un array vuoto
  }
}

// ----------------------------------------------------------
// FUNZIONE: scrivi i dati in un file JSON
// Salva l'array/oggetto come testo JSON formattato
// ----------------------------------------------------------
function scriviFile(percorso, dati) {
  try {
    var testo = JSON.stringify(dati, null, 2); // Converte in testo JSON, con indentazione di 2 spazi
    fs.writeFileSync(percorso, testo, "utf8"); // Scrive sul disco
  } catch (errore) {
    console.error("Errore scrittura file:", errore);
  }
}

// ----------------------------------------------------------
// FUNZIONE: calcola la media dei voti di un film
// Restituisce la media arrotondata a 1 decimale (es: "3.7")
// Se non ci sono voti, restituisce 0
// ----------------------------------------------------------
function calcolaMedia(voti) {
  // Se non ci sono voti, ritorna 0
  if (!voti || voti.length === 0) {
    return 0;
  }

  var totale = 0;

  for (var i = 0; i < voti.length; i++) {
    var voto = voti[i];

    // Compatibilità: i vecchi voti sono numeri, i nuovi sono oggetti {user, score}
    if (typeof voto === "number") {
      totale = totale + voto;
    } else {
      totale = totale + voto.score;
    }
  }

  // Dividiamo il totale per il numero di voti e arrotondiamo a 1 decimale
  var media = (totale / voti.length).toFixed(1);
  return media;
}

// ----------------------------------------------------------
// FUNZIONE: cerca un film per ID nell'array film
// Restituisce il film trovato, oppure null se non esiste
// ----------------------------------------------------------
function trovaFilmPerId(film, id) {
  for (var i = 0; i < film.length; i++) {
    if (film[i].id === id) {
      return film[i]; // Film trovato!
    }
  }
  return null; // Nessun film trovato
}

// ----------------------------------------------------------
// MIDDLE: controlla se l'utente è loggato
// Se non è loggato, lo manda alla pagina di login
// Questa funzione si usa come "guardia" davanti alle rotte protette
// ----------------------------------------------------------
function controllaLogin(req, res, next) {
  if (req.session.utente) {
    next(); // L'utente è loggato: vai avanti normalmente
  } else {
    res.redirect("/login"); // Non loggato: vai al login
  }
}

// =============================================================
//  🏠 ROTTA HOME  →  GET /
//  La pagina principale: manda al catalogo se loggato
//  altrimenti manda al login
// =============================================================

app.get("/", function (req, res) {
  if (req.session.utente) {
    res.redirect("/catalog"); // Già loggato → vai al catalogo
  } else {
    res.redirect("/login");   // Non loggato → vai al login
  }
});

// =============================================================
//  🔐 ROTTE LOGIN  →  GET e POST /login
// =============================================================

// Mostra la pagina di login
app.get("/login", function (req, res) {
  // Se è già loggato, non ha senso stare al login: vai al catalogo
  if (req.session.utente) {
    res.redirect("/catalog");
    return;
  }

  // Mostra la pagina di login senza nessun messaggio di errore
  res.render("login", { error: null });
});

// Gestisce il form di login (quando l'utente clicca "Entra")
app.post("/login", function (req, res) {
  var username = req.body.username;
  var email    = req.body.email;

  // Controlla che i campi non siano vuoti
  if (!username || !email) {
    res.render("login", { error: "Inserisci nome utente ed email!" });
    return;
  }

  // Carica tutti gli utenti dal file JSON
  var utenti    = leggiFile(FILE_UTENTI);
  var utenteTrovato = null;

  // Cerca se esiste già un utente con quella username e quella email
  for (var i = 0; i < utenti.length; i++) {
    if (utenti[i].username === username && utenti[i].email === email) {
      utenteTrovato = utenti[i];
      break; // Trovato! Usciamo dal ciclo
    }
  }

  // Se non esiste, lo registriamo al volo (registrazione automatica)
  if (utenteTrovato === null) {
    utenteTrovato = { username: username, email: email };
    utenti.push(utenteTrovato);            // Aggiunge l'utente all'array
    scriviFile(FILE_UTENTI, utenti);       // Salva il file aggiornato
  }

  // Salviamo l'utente nella sessione (così rimane loggato)
  req.session.utente = utenteTrovato;
  res.redirect("/catalog"); // Vai al catalogo!
});

// =============================================================
//  🚪 ROTTA LOGOUT  →  GET /logout
//  Distrugge la sessione e torna al login
// =============================================================

app.get("/logout", function (req, res) {
  req.session.destroy(); // Cancella la sessione (= "esci dall'account")
  res.redirect("/login");
});

// =============================================================
//  🎬 ROTTA CATALOGO  →  GET /catalog
//  Mostra tutti i film. Supporta la ricerca per titolo.
//  ⚠️ Protetta: solo utenti loggati possono vederla
// =============================================================

app.get("/catalog", controllaLogin, function (req, res) {
  // Legge il testo cercato dall'URL (es: /catalog?search=titanic)
  var ricerca = "";
  if (req.query.search) {
    ricerca = req.query.search.toLowerCase(); // Convertiamo in minuscolo per cercare meglio
  }

  // Carica tutti i film dal file JSON
  var tuttiIFilm = leggiFile(FILE_FILM);
  var filmDaMostrare = tuttiIFilm; // Di default mostra tutti i film

  // Se l'utente ha scritto qualcosa nella ricerca, filtra i film
  if (ricerca !== "") {
    filmDaMostrare = []; // Partiamo da un array vuoto

    for (var i = 0; i < tuttiIFilm.length; i++) {
      var titoloMinuscolo = tuttiIFilm[i].title.toLowerCase();

      // Aggiungiamo il film solo se il titolo contiene la parola cercata
      if (titoloMinuscolo.includes(ricerca)) {
        filmDaMostrare.push(tuttiIFilm[i]);
      }
    }
  }

  // Calcola la media voti per ogni film prima di mandare i dati alla pagina
  for (var j = 0; j < filmDaMostrare.length; j++) {
    filmDaMostrare[j].avgRating = calcolaMedia(filmDaMostrare[j].ratings);
  }

  // Manda i dati alla pagina "index.ejs"
  res.render("index", {
    user: req.session.utente,    // Info sull'utente loggato
    movies: filmDaMostrare,      // Lista dei film
    searchQuery: ricerca         // Parola cercata (per mostrarlo nel campo di ricerca)
  });
});

// =============================================================
//  ➕ API AGGIUNGI FILM  →  POST /api/movies
//  Aggiunge un nuovo film al catalogo
//  ⚠️ Protetta: solo utenti loggati possono usarla
// =============================================================

app.post("/api/movies", controllaLogin, function (req, res) {
  var titolo       = req.body.title;
  var descrizione  = req.body.description;
  var copertina    = req.body.coverUrl;
  var regista      = req.body.director;

  // Controllo: tutti i campi devono essere compilati
  if (!titolo || !descrizione || !copertina || !regista) {
    res.status(400).send("Devi compilare tutti i campi!");
    return;
  }

  // Carica i film esistenti
  var film = leggiFile(FILE_FILM);

  // Crea l'oggetto del nuovo film
  var nuovoFilm = {
    id: Date.now().toString(), // ID univoco basato sul tempo attuale (es: "1709123456789")
    title: titolo,
    description: descrizione,
    coverUrl: copertina,
    director: regista,
    ratings: [],  // Inizia senza voti
    reviews: []   // Inizia senza recensioni
  };

  // Aggiunge il film all'array e salva il file
  film.push(nuovoFilm);
  scriviFile(FILE_FILM, film);

  res.redirect("/catalog"); // Torna al catalogo
});

// =============================================================
//  ⭐ API VOTA FILM  →  POST /api/movies/:id/rate
//  Permette di votare un film da 1 a 5 stelle.
//  Se hai già votato, il tuo voto precedente viene aggiornato.
//  ⚠️ Protetta: solo utenti loggati possono usarla
// =============================================================

app.post("/api/movies/:id/rate", controllaLogin, function (req, res) {
  var idFilm   = req.params.id;                        // ID del film dall'URL
  var voto     = parseInt(req.body.rating, 10);         // Il voto (da 1 a 5)
  var username = req.session.utente.username;           // Chi sta votando

  // Il voto deve essere un numero tra 1 e 5
  if (isNaN(voto) || voto < 1 || voto > 5) {
    res.status(400).json({ error: "Il voto deve essere tra 1 e 5!" });
    return;
  }

  // Carica tutti i film
  var film = leggiFile(FILE_FILM);
  var filmTrovato = trovaFilmPerId(film, idFilm);

  // Se il film non esiste, errore
  if (filmTrovato === null) {
    res.status(404).json({ error: "Film non trovato!" });
    return;
  }

  // Assicuriamoci che l'array dei voti esista
  if (!filmTrovato.ratings) {
    filmTrovato.ratings = [];
  }

  // Converti i vecchi voti numerici nel formato nuovo {user, score}
  // (compatibilità con versioni precedenti del database)
  for (var i = 0; i < filmTrovato.ratings.length; i++) {
    if (typeof filmTrovato.ratings[i] === "number") {
      filmTrovato.ratings[i] = {
        user: "Utente Vecchio " + i,
        score: filmTrovato.ratings[i]
      };
    }
  }

  // Controlla se questo utente ha già votato
  var haGiaVotato = false;

  for (var j = 0; j < filmTrovato.ratings.length; j++) {
    if (filmTrovato.ratings[j].user === username) {
      // Ha già votato: aggiorna il vecchio voto con quello nuovo
      filmTrovato.ratings[j].score = voto;
      haGiaVotato = true;
      break;
    }
  }

  // Se non aveva mai votato, aggiungi il suo voto nuovo
  if (!haGiaVotato) {
    filmTrovato.ratings.push({ user: username, score: voto });
  }

  // Salva i film aggiornati nel file
  scriviFile(FILE_FILM, film);

  // Ricalcola la media e rispondi con i dati aggiornati (risposta JSON per AJAX)
  var nuovaMedia = calcolaMedia(filmTrovato.ratings);
  res.json({ success: true, avgRating: nuovaMedia });
});

// =============================================================
//  🎞️ ROTTA DETTAGLIO FILM  →  GET /movie/:id
//  Mostra la pagina con i dettagli di un singolo film
//  ⚠️ Protetta: solo utenti loggati possono vederla
// =============================================================

app.get("/movie/:id", controllaLogin, function (req, res) {
  var idFilm = req.params.id; // ID del film dall'URL

  // Carica tutti i film e cerca quello con questo ID
  var film = leggiFile(FILE_FILM);
  var filmTrovato = trovaFilmPerId(film, idFilm);

  // Se il film non esiste, mostra errore 404
  if (filmTrovato === null) {
    res.status(404).send("Film non trovato!");
    return;
  }

  // Calcola la media voti per questo film specifico
  filmTrovato.avgRating = calcolaMedia(filmTrovato.ratings);

  // Manda i dati alla pagina "movie.ejs"
  res.render("movie", {
    user: req.session.utente,
    movie: filmTrovato
  });
});

// =============================================================
//  ✍️ ROTTA AGGIUNGI RECENSIONE  →  POST /movie/:id/review
//  Salva una recensione testuale per un film
//  ⚠️ Protetta: solo utenti loggati possono usarla
// =============================================================

app.post("/movie/:id/review", controllaLogin, function (req, res) {
  var idFilm      = req.params.id;
  var testoReview = req.body.reviewText;

  // Se il testo è vuoto, torna alla pagina del film senza fare nulla
  if (!testoReview) {
    res.redirect("/movie/" + idFilm);
    return;
  }

  // Carica i film e cerca quello giusto
  var film = leggiFile(FILE_FILM);
  var filmTrovato = trovaFilmPerId(film, idFilm);

  // Aggiunge la recensione solo se il film esiste
  if (filmTrovato !== null) {
    // Assicuriamoci che l'array delle recensioni esista
    if (!filmTrovato.reviews) {
      filmTrovato.reviews = [];
    }

    // Crea l'oggetto recensione con autore, testo e data
    var nuovaRecensione = {
      user: req.session.utente.username,
      text: testoReview,
      date: new Date().toISOString() // Data e ora di adesso in formato standard
    };

    // Aggiunge la recensione e salva
    filmTrovato.reviews.push(nuovaRecensione);
    scriviFile(FILE_FILM, film);
  }

  // Torna alla pagina del film
  res.redirect("/movie/" + idFilm);
});

// =============================================================
//  🟢 AVVIO DEL SERVER
//  Il server comincia ad ascoltare sulla porta 3000
// =============================================================

app.listen(PORT, function () {
  console.log("✅ Server avviato! Vai su http://localhost:" + PORT);
});
