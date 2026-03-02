# ✦ Stellar Catalog

> **Catalogo cinematografico premium** — Node.js · Express 5 · EJS · Bootstrap 5

Un'applicazione web multi-utente per catalogare film, assegnare voti con stelle e pubblicare recensioni. I dati vengono salvati su file JSON locali, senza necessità di un database esterno.

---

## 📋 Requisiti

| Requisito | Versione minima |
|-----------|----------------|
| Node.js   | 18             |
| npm       | 9              |
| Browser   | Chrome 90+, Firefox 88+, Safari 14+ |

---

## 🚀 Installazione e avvio

```bash
git clone https://github.com/thomas-addamo/LavoroTPSIT_Catalogo_film.git
cd LavoroTPSIT_Catalogo_film
npm install
node server.js
```

Aprire il browser su **http://localhost:3000**

---

## 🗂️ Struttura del progetto

```
.
├── server.js               # Entry-point: routing, middleware, logica
├── package.json
├── data/
│   ├── movies.json         # Database film (JSON)
│   └── users.json          # Database utenti (JSON)
├── views/
│   ├── layout.ejs          # Scheletro HTML condiviso (navbar, modale)
│   ├── index.ejs           # Griglia del catalogo
│   ├── movie.ejs           # Pagina di dettaglio film
│   └── login.ejs           # Schermata di accesso
└── public/
    ├── css/style.css       # Tema scuro con variabili CSS
    └── js/main.js          # Logica client (stelle, modale, ricerca)
```

---

## ✨ Funzionalità

### 🔐 Autenticazione
- Accesso con **nome utente + email** (nessuna password richiesta)
- Registrazione automatica al primo accesso
- Sessioni gestite con `express-session`

### 🎬 Catalogo film
- Visualizzazione a griglia di tutti i film
- **Ricerca** per titolo (case-insensitive) tramite barra nella navbar
- **Aggiunta film** tramite modale: titolo, regista, URL copertina, descrizione

### ⭐ Voto a stelle
- Overlay interattivo al passaggio del mouse sulla card
- Scale 1–5 stelle con aggiornamento AJAX (senza refresh pagina)
- Un voto per utente; il secondo voto **sovrascrive** il precedente
- Badge con media aggiornato in tempo reale

### 📝 Recensioni
- Pagina di dettaglio con informazioni complete sul film
- Form collassabile per aggiungere una recensione testuale
- Recensioni ordinate dalla più recente; mostrano username e data

---

## 🌐 Rotte principali

| Metodo | Rotta | Descrizione |
|--------|-------|-------------|
| `GET`  | `/` | Redirect al catalogo o al login |
| `GET`  | `/login` | Pagina di accesso |
| `POST` | `/login` | Autenticazione / registrazione |
| `GET`  | `/logout` | Disconnessione |
| `GET`  | `/catalog` | Catalogo (`?search=query` per filtrare) |
| `POST` | `/api/movies` | Aggiunta nuovo film |
| `POST` | `/api/movies/:id/rate` | Voto — body JSON: `{ "rating": 1-5 }` |
| `GET`  | `/movie/:id` | Dettaglio film |
| `POST` | `/movie/:id/review` | Pubblica recensione |

---

## 🛠️ Stack tecnologico

| Layer | Tecnologia |
|-------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express 5 |
| Template | EJS + express-ejs-layouts |
| Sessioni | express-session |
| Body parsing | body-parser |
| Frontend | Bootstrap 5.3, Bootstrap Icons, Outfit (Google Fonts) |
| Storage | File system JSON (nessun DB esterno) |

---

## 📄 Licenza

MIT License — © 2026 [thomas-addamo](https://github.com/thomas-addamo)
