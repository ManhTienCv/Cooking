document.addEventListener('DOMContentLoaded', function () {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal-active');
            } else {
                entry.target.classList.remove('reveal-active');
            }
        });
    }, observerOptions);

    const reveals = document.querySelectorAll('.reveal');
    reveals.forEach((el) => observer.observe(el));

    // Staggered Animation for Grids
    const staggerObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const cards = entry.target.querySelectorAll('.stagger-card');
                cards.forEach((card, index) => {
                    clearTimeout(card.animationTimeout);
                    card.animationTimeout = setTimeout(() => {
                        card.classList.add('active');
                    }, index * 150);
                });
            } else {
                // Replay animation when scrolling out
                const cards = entry.target.querySelectorAll('.stagger-card');
                cards.forEach(card => {
                    clearTimeout(card.animationTimeout);
                    card.classList.remove('active');
                });
            }
        });
    }, { threshold: 0.1 });

    const recipeGrid = document.getElementById('recipe-grid');
    const categoryGrid = document.getElementById('category-grid');

    if (recipeGrid) staggerObserver.observe(recipeGrid);
    if (categoryGrid) staggerObserver.observe(categoryGrid);
});
