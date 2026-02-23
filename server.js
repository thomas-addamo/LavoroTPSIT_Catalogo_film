const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const expressLayouts = require("express-ejs-layouts");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

// Middleware classici
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layout");
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(
  session({
    secret: "super-premium-movie-catalog-secret",
    resave: false,
    saveUninitialized: false,
  })
);

// File paths
const USERS_FILE = path.join(__dirname, "data", "users.json");
const MOVIES_FILE = path.join(__dirname, "data", "movies.json");

// Funzioni classiche per i file
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

function writeData(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Errore scrittura:", err);
  }
}

// Controllo Login
function requireAuth(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect("/login");
  }
}

// --- Rotte base ---

app.get("/", function (req, res) {
  if (req.session.user) {
    res.redirect("/catalog");
  } else {
    res.redirect("/login");
  }
});

app.get("/login", function (req, res) {
  if (req.session.user) {
    res.redirect("/catalog");
  } else {
    res.render("login", { error: null });
  }
});

app.post("/login", function (req, res) {
  const username = req.body.username;
  const email = req.body.email;

  if (username === "" || email === "") {
    res.render("login", { error: "Inserisci nome utente ed email." });
    return;
  }

  let users = readData(USERS_FILE);
  let userFound = null;

  for (let i = 0; i < users.length; i++) {
    if (users[i].email === email && users[i].username === username) {
      userFound = users[i];
      break;
    }
  }

  if (userFound === null) {
    userFound = { username: username, email: email };
    users.push(userFound);
    writeData(USERS_FILE, users);
  }

  req.session.user = userFound;
  res.redirect("/catalog");
});

app.get("/logout", function (req, res) {
  req.session.destroy();
  res.redirect("/login");
});

// --- Catalogo ---

app.get("/catalog", requireAuth, function (req, res) {
  let searchQuery = "";
  if (req.query.search) {
    searchQuery = req.query.search.toLowerCase();
  }
  
  let movies = readData(MOVIES_FILE);
  let filteredMovies = [];

  if (searchQuery !== "") {
    for (let i = 0; i < movies.length; i++) {
      let titleLower = movies[i].title.toLowerCase();
      if (titleLower.includes(searchQuery)) {
        filteredMovies.push(movies[i]);
      }
    }
    movies = filteredMovies;
  }

  // Calcolo media dei voti senza funzioni complicate
  for (let i = 0; i < movies.length; i++) {
    let avgRating = 0;
    
    if (movies[i].ratings && movies[i].ratings.length > 0) {
      let sum = 0;
      for (let j = 0; j < movies[i].ratings.length; j++) {
        // Fix per rating: prima era un numero, ora sara un oggetto {user, score}
        // ma consideriamo sia numeri vecchi che oggetti nuovi per compatibilita
        if (typeof movies[i].ratings[j] === 'number') {
           sum = sum + movies[i].ratings[j];
        } else {
           sum = sum + movies[i].ratings[j].score;
        }
      }
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

// Voto - Limite 1 voto per utente
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

  // Convert old ratings to {user: 'Unknown', score: number} to avoid crashes
  for (let s = 0; s < movieFound.ratings.length; s++) {
    if (typeof movieFound.ratings[s] === 'number') {
       movieFound.ratings[s] = { user: "Vecchio Utente " + s, score: movieFound.ratings[s] };
    }
  }

  // Controllo se l'utente ha già votato
  let userAlreadyRated = false;
  for (let j = 0; j < movieFound.ratings.length; j++) {
    if (movieFound.ratings[j].user === currentUser) {
      // Modifica il voto esistente
      movieFound.ratings[j].score = ratingScore;
      userAlreadyRated = true;
      break;
    }
  }

  // Se non ha votato aggiunge nuovo
  if (userAlreadyRated === false) {
    movieFound.ratings.push({
      user: currentUser,
      score: ratingScore
    });
  }

  writeData(MOVIES_FILE, movies);

  // Ricalcolo nuova media
  let sum = 0;
  for (let k = 0; k < movieFound.ratings.length; k++) {
    sum = sum + movieFound.ratings[k].score;
  }
  let avgRating = (sum / movieFound.ratings.length).toFixed(1);

  res.json({ success: true, avgRating: avgRating });
});

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

app.post("/movie/:id/review", requireAuth, function (req, res) {
  const movieId = req.params.id;
  const reviewText = req.body.reviewText;

  if (reviewText === "") {
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
    
    movieFound.reviews.push({
      user: req.session.user.username,
      text: reviewText,
      date: new Date().toISOString()
    });
    
    writeData(MOVIES_FILE, movies);
  }

  res.redirect("/movie/" + movieId);
});

app.listen(PORT, function () {
  console.log("Server avviato sulla porta " + PORT);
});
