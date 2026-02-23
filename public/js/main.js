/**
 * Questo script gestisce le interazioni dinamiche sul client, 
 * come il sistema di voto con le stelle e la gestione della modale.
 */
document.addEventListener('DOMContentLoaded', () => {
    
    // --- Logica per il Sistema di Voto con le Stelle ---
    
    // Seleziona tutti i contenitori di stelle nelle card dei film
    const starContainers = document.querySelectorAll('.star-rating');

    starContainers.forEach(container => {
        const stars = container.querySelectorAll('.star');
        const movieId = container.getAttribute('data-movie-id');

        // Aggiunge gli eventi per ogni singola stella dentro il contenitore
        stars.forEach(star => {
            
            // Effetto hover: illumina le stelle quando il mouse passa sopra
            star.addEventListener('mouseenter', () => {
                const rating = parseInt(star.getAttribute('data-rating'));
                highlightStars(stars, rating);
            });

            // Reset: toglie l'illuminazione quando il mouse esce
            star.addEventListener('mouseleave', () => {
                resetStars(stars);
            });

            /**
             * Click per votare: invia una richiesta AJAX (fetch) al server
             * per registrare il voto senza ricaricare l'intera pagina immediatamente.
             */
            star.addEventListener('click', async (e) => {
                // Impedisce che il click sulla stella attivi anche il link della card
                e.preventDefault();
                e.stopPropagation();

                const rating = parseInt(star.getAttribute('data-rating'));
                
                try {
                    // Chiamata POST all'API del server
                    const response = await fetch(`/api/movies/${movieId}/rate`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ rating })
                    });

                    const result = await response.json();

                    if (result.success) {
                        // Feedback visivo immediato all'utente
                        container.innerHTML = `<span class="text-success fw-bold fade-in-up"><i class="bi bi-check-circle-fill me-1"></i> Voto ${rating} inviato!</span>`;
                        
                        // Aggiorna il badge della media dei voti sulla card se presente
                        const card = container.closest('.movie-card');
                        if (card) {
                            const badge = card.querySelector('.average-rating');
                            if (badge) badge.innerText = result.avgRating;
                        }

                        // Ricarica la pagina dopo un secondo per riflettere i cambiamenti ovunque
                        setTimeout(() => {
                            window.location.reload(); 
                        }, 1000);
                    }
                } catch (error) {
                    console.error('Errore durante il voto:', error);
                    alert('Si è verificato un errore durante l\'invio del voto.');
                }
            });
        });
    });

    /**
     * Funzione per illuminare le stelle fino a quella selezionata (effetto hover).
     */
    function highlightStars(stars, rating) {
        stars.forEach(star => {
            const currentRating = parseInt(star.getAttribute('data-rating'));
            if (currentRating <= rating) {
                star.classList.add('hovered'); // Aggiunge la classe CSS per l'illuminazione
            } else {
                star.classList.remove('hovered');
            }
        });
    }

    /**
     * Funzione per rimuovere l'effetto hover da tutte le stelle.
     */
    function resetStars(stars) {
        stars.forEach(star => {
            star.classList.remove('hovered');
        });
    }

    // --- Miglioramenti UX per le Modali di Bootstrap 5 ---

    // Quando si apre la modale per aggiungere un film, mette automaticamente il focus sul campo Titolo
    const addMovieModal = document.getElementById('addMovieModal');
    if (addMovieModal) {
        addMovieModal.addEventListener('shown.bs.modal', () => {
            const titleInput = addMovieModal.querySelector('input[name="title"]');
            if (titleInput) titleInput.focus();
        });
    }

    // --- Gestione della barra di ricerca ---

    const searchInput = document.querySelector('.search-form input[type="search"]');
    if (searchInput) {
        // Se c'è già un testo cercato, posiziona il cursore alla fine della parola
        if (searchInput.value) {
            const length = searchInput.value.length;
            searchInput.setSelectionRange(length, length);
        }
    }
});
