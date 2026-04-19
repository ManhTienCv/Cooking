/**
 * Tên file: scrollytelling.js
 * Công dụng: Hiệu ứng cuộn tranh (Scrollytelling).
 * Chức năng: 
 * - Kích hoạt animation khi element vào vùng nhìn thấy (IntersectionObserver).
 * - Hiệu ứng Parallax cho các section.
 */
function initScrollytelling() {


    // 1. Parallax & Slide-in Effects for Story Section
    const storySection = document.getElementById('story-section');
    const storyText = document.querySelector('.story-text');
    const storyImage = document.querySelector('.story-image');

    if (storySection && storyText && storyImage) {
        window.addEventListener('scroll', () => {
            const rect = storySection.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            let progress = (windowHeight - rect.top) / (windowHeight + rect.height);
            let revealProgress = Math.min(Math.max(progress * 2, 0), 1);
            const translateValue = 50 * (1 - revealProgress);

            storyText.style.transform = `translateX(-${translateValue}px)`;
            storyText.style.opacity = revealProgress;

            storyImage.style.transform = `translateX(${translateValue}px)`;
            storyImage.style.opacity = revealProgress;
        });
    }

    // 2. Staggered Reveal for Team Section
    const teamSection = document.getElementById('team-section');
    const teamCards = document.querySelectorAll('.team-card');

    if (teamSection && teamCards.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    teamCards.forEach((card, index) => {
                        clearTimeout(card.animationTimeout);
                        card.animationTimeout = setTimeout(() => {
                            card.classList.add('active');
                        }, index * 150);
                    });
                } else {
                    teamCards.forEach(card => {
                        clearTimeout(card.animationTimeout);
                        card.classList.remove('active');
                    });
                }
            });
        }, { threshold: 0.1 });
        observer.observe(teamSection);
    }

    // 3. Scale Up Effect for Mission Section
    const missionSection = document.getElementById('mission-section');
    const missionContent = document.querySelector('.mission-content');

    if (missionSection && missionContent) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    missionContent.classList.add('active');
                } else {
                    missionContent.classList.remove('active');
                }
            });
        }, { threshold: 0.2 });
        observer.observe(missionSection);
    }

    // 4. Staggered Reveal for Stats Section
    const statsSection = document.getElementById('stats-section');
    const statCards = document.querySelectorAll('.stat-card');

    if (statsSection && statCards.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    statCards.forEach((card, index) => {
                        clearTimeout(card.animationTimeout);
                        card.animationTimeout = setTimeout(() => {
                            card.classList.add('active');
                        }, index * 100);
                    });
                } else {
                    statCards.forEach(card => {
                        clearTimeout(card.animationTimeout);
                        card.classList.remove('active');
                    });
                }
            });
        }, { threshold: 0.2 });
        observer.observe(statsSection);
    }

    // 5. Generic Reveal Animation
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal-active');
            } else {
                entry.target.classList.remove('reveal-active');
            }
        });
    }, { threshold: 0.15 });

    const reveals = document.querySelectorAll('.reveal');
    if (reveals.length > 0) {
        reveals.forEach((el) => revealObserver.observe(el));
    }

    // 6. Generic Staggered Animation for Grids
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

    // IDs of grids to observe
    const gridIds = ['recipe-list-grid', 'blog-grid', 'recipe-grid', 'category-grid', 'features-grid'];
    gridIds.forEach(id => {
        const grid = document.getElementById(id);
        if (grid) {
            console.log('Observing grid:', id);
            staggerObserver.observe(grid);
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollytelling);
} else {
    initScrollytelling();
}
