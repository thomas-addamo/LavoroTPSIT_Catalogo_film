const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const expressLayouts = require("express-ejs-layouts");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

// --- Configurazione Middleware ---

// Imposta EJS come motore di template
app.set("view engine", "ejs");
// Definisce la cartella dove si trovano i file .ejs
app.set("views", path.join(__dirname, "views"));
// Abilita l'utilizzo dei layout per non ripetere header e footer in ogni pagina
app.use(expressLayouts);
// Specifica il file di layout predefinito (views/layout.ejs)
app.set("layout", "layout");
// Rende accessibili i file statici (CSS, JS client, immagini) dalla cartella 'public'
app.use(express.static(path.join(__dirname, "public")));
// Configura body-parser per leggere i dati inviati tramite i form (POST)
app.use(bodyParser.urlencoded({ extended: true }));
// Configura body-parser per leggere i dati inviati in formato JSON
app.use(bodyParser.json());

// Configurazione della sessione per gestire il login dell'utente
app.use(
  session({
    secret: "super-premium-movie-catalog-secret", // Chiave per firmare il cookie della sessione
    resave: false,               // Non salva la sessione se non ci sono modifiche
    saveUninitialized: false,    // Non crea sessioni vuote per utenti non loggati
  })
);

// Percorsi dei file JSON che fungono da database
const USERS_FILE = path.join(__dirname, "data", "users.json");
const MOVIES_FILE = path.join(__dirname, "data", "movies.json");

// --- Funzioni di utilità per il Database (JSON) ---

/**
 * Legge i dati da un file JSON e li restituisce come array/oggetto.
 * Se il file non esiste o c'è un errore, restituisce un array vuoto.
 */
function readData(filePath) {
  try {
    if (fs.existsSync(filePath) === false) {
      return [];
    }
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Errore lettura:", err);
    return [];
  }
}

/**
 * Scrive i dati forniti nel file JSON specificato.
 */
function writeData(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Errore scrittura:", err);
  }
}

/**
 * Middleware di autenticazione: controlla se l'utente è loggato.
 * Se non lo è, lo reindirizza alla pagina di login.
 */
function requireAuth(req, res, next) {
  if (req.session.user) {
    next(); // Utente loggato, procedi alla rotta successiva
  } else {
    res.redirect("/login"); // Utente non loggato, vai al login
  }
}

// --- Rotte Base ---

// Home page: reindirizza al catalogo se loggato, altrimenti al login
app.get("/", function (req, res) {
  if (req.session.user) {
    res.redirect("/catalog");
  } else {
    res.redirect("/login");
  }
});

// Pagina di Login (GET)
app.get("/login", function (req, res) {
  if (req.session.user) {
    res.redirect("/catalog");
  } else {
    res.render("login", { error: null });
  }
});

/**
 * Gestione del Login (POST): registra l'utente se non esiste
 * o lo autentica se le credenziali (semplificate) corrispondono.
 */
app.post("/login", function (req, res) {
  const username = req.body.username;
  const email = req.body.email;

  if (username === "" || email === "") {
    res.render("login", { error: "Inserisci nome utente ed email." });
    return;
  }

  let users = readData(USERS_FILE);
  let userFound = null;

  // Cerca se l'utente esiste già nel database JSON
  for (let i = 0; i < users.length; i++) {
    if (users[i].email === email && users[i].username === username) {
      userFound = users[i];
      break;
    }
  }

  // Se l'utente non esiste, lo crea al volo (Registrazione automatica)
  if (userFound === null) {
    userFound = { username: username, email: email };
    users.push(userFound);
    writeData(USERS_FILE, users);
  }

  // Salva l'utente nella sessione
  req.session.user = userFound;
  res.redirect("/catalog");
});

// Logout: distrugge la sessione e torna al login
app.get("/logout", function (req, res) {
  req.session.destroy();
  res.redirect("/login");
});

// --- Rotte Catalogo e API ---

/**
 * Visualizzazione del Catalogo Film.
 * Supporta la ricerca tramite il parametro query 'search'.
 */
app.get("/catalog", requireAuth, function (req, res) {
  let searchQuery = "";
  if (req.query.search) {
    searchQuery = req.query.search.toLowerCase();
  }
  
  let movies = readData(MOVIES_FILE);
  let filteredMovies = [];

  // Filtra i film in base alla ricerca (case-insensitive)
  if (searchQuery !== "") {
    for (let i = 0; i < movies.length; i++) {
      let titleLower = movies[i].title.toLowerCase();
      if (titleLower.includes(searchQuery)) {
        filteredMovies.push(movies[i]);
      }
    }
    movies = filteredMovies;
  }

  // Calcola la media dei voti per ogni film prima di renderizzare la pagina
  for (let i = 0; i < movies.length; i++) {
    let avgRating = 0;
    
    if (movies[i].ratings && movies[i].ratings.length > 0) {
      let sum = 0;
      for (let j = 0; j < movies[i].ratings.length; j++) {
        // Gestione compatibilità: i voti possono essere numeri o oggetti {user, score}
        if (typeof movies[i].ratings[j] === 'number') {
           sum = sum + movies[i].ratings[j];
        } else {
           sum = sum + movies[i].ratings[j].score;
        }
      }
      // Arrotonda la media a una cifra decimale
      avgRating = (sum / movies[i].ratings.length).toFixed(1);
    }
    
    movies[i].avgRating = avgRating;
  }

  res.render("index", {
    user: req.session.user,
    movies: movies,
    searchQuery: searchQuery,
  });
});

/**
 * API per aggiungere un nuovo film al catalogo.
 */
app.post("/api/movies", requireAuth, function (req, res) {
  const title = req.body.title;
  const description = req.body.description;
  const coverUrl = req.body.coverUrl;
  const director = req.body.director;

  if (title === "" || description === "" || coverUrl === "" || director === "") {
    res.status(400).send("Parametri mancanti");
    return;
  }

  let movies = readData(MOVIES_FILE);
  
  // Crea l'oggetto del nuovo film con un ID univoco basato sul timestamp
  const newMovie = {
    id: Date.now().toString(),
    title: title,
    description: description,
    coverUrl: coverUrl,
    director: director,
    ratings: [],
    reviews: []
  };

  movies.push(newMovie);
  writeData(MOVIES_FILE, movies);

  res.redirect("/catalog");
});

/**
 * API per votare un film.
 * Ogni utente può votare un film una sola volta; se vota di nuovo, il voto precedente viene aggiornato.
 */
app.post("/api/movies/:id/rate", requireAuth, function (req, res) {
  const movieId = req.params.id;
  const ratingScore = parseInt(req.body.rating, 10);
  const currentUser = req.session.user.username;

  if (isNaN(ratingScore) || ratingScore < 1 || ratingScore > 5) {
    res.status(400).json({ error: "Voto non valido" });
    return;
  }

  let movies = readData(MOVIES_FILE);
  let movieFound = null;

  for (let i = 0; i < movies.length; i++) {
    if (movies[i].id === movieId) {
      movieFound = movies[i];
      break;
    }
  }

  if (movieFound === null) {
    res.status(404).json({ error: "Film non trovato" });
    return;
  }

  if (!movieFound.ratings) {
    movieFound.ratings = [];
  }

  // Converte i vecchi voti numerici nel nuovo formato oggetto per evitare crash
  for (let s = 0; s < movieFound.ratings.length; s++) {
    if (typeof movieFound.ratings[s] === 'number') {
       movieFound.ratings[s] = { user: "Vecchio Utente " + s, score: movieFound.ratings[s] };
    }
  }

  // Controlla se l'utente ha già votato questo film
  let userAlreadyRated = false;
  for (let j = 0; j < movieFound.ratings.length; j++) {
    if (movieFound.ratings[j].user === currentUser) {
      // Se trovato, aggiorna il punteggio esistente
      movieFound.ratings[j].score = ratingScore;
      userAlreadyRated = true;
      break;
    }
  }

  // Se l'utente non ha mai votato, aggiunge un nuovo record
  if (userAlreadyRated === false) {
    movieFound.ratings.push({
      user: currentUser,
      score: ratingScore
    });
  }

  writeData(MOVIES_FILE, movies);

  // Ricalcola la nuova media per inviarla come risposta alla chiamata AJAX
  let sum = 0;
  for (let k = 0; k < movieFound.ratings.length; k++) {
    sum = sum + movieFound.ratings[k].score;
  }
  let avgRating = (sum / movieFound.ratings.length).toFixed(1);

  res.json({ success: true, avgRating: avgRating });
});

/**
 * Pagina dei dettagli di un singolo film.
 */
app.get("/movie/:id", requireAuth, function (req, res) {
  const movieId = req.params.id;
  let movies = readData(MOVIES_FILE);
  let movieFound = null;

  for (let i = 0; i < movies.length; i++) {
    if (movies[i].id === movieId) {
      movieFound = movies[i];
      break;
    }
  }

  if (movieFound === null) {
    res.status(404).send("Film non trovato");
    return;
  }

  // Calcolo della media voti specifica per questo film
  let avgRating = 0;
  if (movieFound.ratings && movieFound.ratings.length > 0) {
    let sum = 0;
    for (let j = 0; j < movieFound.ratings.length; j++) {
      if (typeof movieFound.ratings[j] === 'number') {
         sum = sum + movieFound.ratings[j];
      } else {
         sum = sum + movieFound.ratings[j].score;
      }
    }
    avgRating = (sum / movieFound.ratings.length).toFixed(1);
  }
  
  movieFound.avgRating = avgRating;

  res.render("movie", {
    user: req.session.user,
    movie: movieFound
  });
});

/**
 * API per aggiungere una recensione testuale a un film.
 */
app.post("/movie/:id/review", requireAuth, function (req, res) {
  const movieId = req.params.id;
  const reviewText = req.body.reviewText;

  if (reviewText === "") {
    // Se la recensione è vuota, ricarica semplicemente la pagina
    res.redirect("/movie/" + movieId);
    return;
  }

  let movies = readData(MOVIES_FILE);
  let movieFound = null;

  for (let i = 0; i < movies.length; i++) {
    if (movies[i].id === movieId) {
      movieFound = movies[i];
      break;
    }
  }

  if (movieFound !== null) {
    if (!movieFound.reviews) {
      movieFound.reviews = [];
    }
    
    // Aggiunge la recensione con autore e data corrente in formato ISO
    movieFound.reviews.push({
      user: req.session.user.username,
      text: reviewText,
      date: new Date().toISOString()
    });
    
    writeData(MOVIES_FILE, movies);
  }

  res.redirect("/movie/" + movieId);
});

// Avvio del server sulla porta definita
app.listen(PORT, function () {
  console.log("Server avviato sulla porta " + PORT);
});
