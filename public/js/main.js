// =============================================================
//  📋 main.js  —  Codice che gira nel BROWSER (lato client)
//  Questo file gestisce ciò che succede sulla pagina
//  SENZA ricaricarla: voto stelle, modale, barra di ricerca
// =============================================================

// Aspettiamo che la pagina sia completamente caricata prima di fare qualsiasi cosa
document.addEventListener("DOMContentLoaded", function () {

  // =============================================================
  //  ⭐ SEZIONE 1: SISTEMA DI VOTO CON LE STELLE
  //  Gestisce l'effetto hover e il click per votare un film
  // =============================================================

  // Prendiamo tutti i "blocchi stelle" presenti nella pagina
  // (ogni card del film ne ha uno)
  var blocchiStelle = document.querySelectorAll(".star-rating");

  // Per ogni blocco stelle, impostiamo i comportamenti
  for (var b = 0; b < blocchiStelle.length; b++) {
    var blocco  = blocchiStelle[b];
    var stelle  = blocco.querySelectorAll(".star");
    var idFilm  = blocco.getAttribute("data-movie-id"); // ID del film salvato nell'HTML

    // Aggiungiamo i comportamenti a ogni singola stella del blocco
    // Usiamo una funzione separata per evitare problemi con le variabili nei cicli
    impostaComportamentoStelle(blocco, stelle, idFilm);
  }

  // ----------------------------------------------------------
  // FUNZIONE: imposta gli eventi per un gruppo di stelle
  // ----------------------------------------------------------
  function impostaComportamentoStelle(blocco, stelle, idFilm) {
    for (var i = 0; i < stelle.length; i++) {
      var stella = stelle[i];

      // 🌟 HOVER: quando il mouse passa sopra una stella, illumina quelle precedenti
      stella.addEventListener("mouseenter", function () {
        var valore = parseInt(this.getAttribute("data-rating"));
        illuminaStelle(stelle, valore);
      });

      // 🌑 MOUSE FUORI: quando il mouse esce, toglie l'illuminazione
      stella.addEventListener("mouseleave", function () {
        spegniStelle(stelle);
      });

      // 👆 CLICK: quando si clicca su una stella, manda il voto al server
      stella.addEventListener("click", function (evento) {
        // Blocchiamo il comportamento di default (aprirebbe il link della card)
        evento.preventDefault();
        evento.stopPropagation();

        var voto = parseInt(this.getAttribute("data-rating"));

        // Chiamiamo la funzione che manda il voto al server
        mandaVoto(blocco, stelle, idFilm, voto);
      });
    }
  }

  // ----------------------------------------------------------
  // FUNZIONE: illumina le stelle fino al numero indicato
  // Esempio: se rating = 3, illumina le stelle 1, 2 e 3
  // ----------------------------------------------------------
  function illuminaStelle(stelle, rating) {
    for (var i = 0; i < stelle.length; i++) {
      var numeroStella = parseInt(stelle[i].getAttribute("data-rating"));

      if (numeroStella <= rating) {
        stelle[i].classList.add("hovered");    // Aggiunge la classe CSS che la illumina
      } else {
        stelle[i].classList.remove("hovered"); // Toglie la classe dalle stelle dopo
      }
    }
  }

  // ----------------------------------------------------------
  // FUNZIONE: spegni tutte le stelle (togli l'illuminazione da tutte)
  // ----------------------------------------------------------
  function spegniStelle(stelle) {
    for (var i = 0; i < stelle.length; i++) {
      stelle[i].classList.remove("hovered");
    }
  }

  // ----------------------------------------------------------
  // FUNZIONE: manda il voto al server usando fetch (senza ricaricare la pagina)
  // ----------------------------------------------------------
  function mandaVoto(blocco, stelle, idFilm, voto) {
    // Mandiamo una richiesta POST al server con il voto scelto
    fetch("/api/movies/" + idFilm + "/rate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json" // Diciamo al server che mandiamo JSON
      },
      body: JSON.stringify({ rating: voto }) // Il voto in formato JSON
    })
    .then(function (risposta) {
      return risposta.json(); // Convertiamo la risposta del server in oggetto JS
    })
    .then(function (dati) {
      // Se il server ci dice che è andato tutto bene...
      if (dati.success) {

        // Sostituiamo le stelle con un messaggio di conferma verde
        blocco.innerHTML = '<span class="text-success fw-bold">✅ Voto ' + voto + ' inviato!</span>';

        // Aggiorniamo anche il badge con la media dei voti sulla card del film
        var card  = blocco.closest(".movie-card");
        if (card) {
          var badge = card.querySelector(".average-rating");
          if (badge) {
            badge.innerText = dati.avgRating; // Mostra la nuova media
          }
        }

        // Dopo 1 secondo, ricarichiamo la pagina per aggiornare tutto
        setTimeout(function () {
          window.location.reload();
        }, 1000);
      }
    })
    .catch(function (errore) {
      // Se qualcosa è andato storto, mostriamo un messaggio di errore
      console.error("Errore durante il voto:", errore);
      alert("Qualcosa è andato storto! Riprova.");
    });
  }

  // =============================================================
  //  🪟 SEZIONE 2: MODALE AGGIUNGI FILM
  //  Quando si apre la finestra per aggiungere un film,
  //  il cursore va automaticamente nel campo "Titolo"
  // =============================================================

  var modaleAggiungiFilm = document.getElementById("addMovieModal");

  if (modaleAggiungiFilm) {
    // L'evento "shown.bs.modal" scatta quando la modale di Bootstrap è completamente aperta
    modaleAggiungiFilm.addEventListener("shown.bs.modal", function () {
      var campoTitolo = modaleAggiungiFilm.querySelector('input[name="title"]');

      if (campoTitolo) {
        campoTitolo.focus(); // Mette il cursore nel campo titolo automaticamente
      }
    });
  }

  // =============================================================
  //  🔍 SEZIONE 3: BARRA DI RICERCA
  //  Se l'utente ha già cercato qualcosa, mettiamo il cursore
  //  alla FINE del testo (non all'inizio)
  // =============================================================

  var campoCerca = document.querySelector(".search-form input[type='search']");

  if (campoCerca && campoCerca.value) {
    // Spostiamo il cursore alla fine del testo già scritto
    var lunghezza = campoCerca.value.length;
    campoCerca.setSelectionRange(lunghezza, lunghezza);
  }

}); // Fine del DOMContentLoaded
