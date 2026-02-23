document.addEventListener('DOMContentLoaded', () => {
    
    // Star Rating Logic
    const starContainers = document.querySelectorAll('.star-rating');

    starContainers.forEach(container => {
        const stars = container.querySelectorAll('.star');
        const movieId = container.getAttribute('data-movie-id');

        // Hover effects
        stars.forEach(star => {
            star.addEventListener('mouseenter', () => {
                const rating = parseInt(star.getAttribute('data-rating'));
                highlightStars(stars, rating);
            });

            star.addEventListener('mouseleave', () => {
                resetStars(stars);
            });

            // Click to rate (AJAX)
            star.addEventListener('click', async (e) => {
                // Prevent event bubbling to the card's a href link
                e.preventDefault();
                e.stopPropagation();

                const rating = parseInt(star.getAttribute('data-rating'));
                
                try {
                    const response = await fetch(`/api/movies/${movieId}/rate`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ rating })
                    });

                    const result = await response.json();

                    if (result.success) {
                        // Visual feedback (animation)
                        container.innerHTML = `<span class="text-success fw-bold fade-in-up"><i class="bi bi-check-circle-fill me-1"></i> Voto ${rating} inviato!</span>`;
                        
                        // Update the badge on the card
                        const card = container.closest('.movie-card');
                        if (card) {
                            const badge = card.querySelector('.average-rating');
                            if (badge) badge.innerText = result.avgRating;
                        }

                        // Restore stars after 2 seconds
                        setTimeout(() => {
                            window.location.reload(); // Reload to reflect changes globally for simplicity and coherence
                        }, 1000);
                    }
                } catch (error) {
                    console.error('Errore durante il voto:', error);
                    alert('Si è verificato un errore durante l\'invio del voto.');
                }
            });
        });
    });

    function highlightStars(stars, rating) {
        stars.forEach(star => {
            const currentRating = parseInt(star.getAttribute('data-rating'));
            if (currentRating <= rating) {
                star.classList.add('hovered');
            } else {
                star.classList.remove('hovered');
            }
        });
    }

    function resetStars(stars) {
        stars.forEach(star => {
            star.classList.remove('hovered');
        });
    }

    // Modal Focus fix for Bootstrap 5
    const addMovieModal = document.getElementById('addMovieModal');
    if (addMovieModal) {
        addMovieModal.addEventListener('shown.bs.modal', () => {
            addMovieModal.querySelector('input[name="title"]').focus();
        });
    }

    // Auto-search UX enhancement (optional, could be used to submit form on typing pause)
    const searchInput = document.querySelector('.search-form input[type="search"]');
    if (searchInput) {
        // Just keeping focus at the end of the input if it has a value
        if (searchInput.value) {
            const length = searchInput.value.length;
            searchInput.setSelectionRange(length, length);
        }
    }
});
