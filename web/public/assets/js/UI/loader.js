// frontend/assets/js/UI/loader.js

// Helper to hide loader with transition
function hideLoader() {
  const loader = document.getElementById('pageLoader');
  if (loader && !loader.classList.contains('hidden')) {
    loader.classList.add('hidden'); // Triggers CSS opacity transition
    setTimeout(() => {
      loader.style.display = 'none';
    }, 500); // 500ms match css transition
  }
}

// 1. Initial Load (window.load) - Normal Fade Out
window.addEventListener('load', function () {
  const loader = document.getElementById('pageLoader');
  if (loader) {
    // 800ms delay to show logo/spinner clearly
    setTimeout(() => {
      hideLoader();
    }, 800);
  }
});

// 2. Safety Fallback (2s)
setTimeout(() => {
  hideLoader();
}, 2000);

// 3. Handle BFCache (check if page is restored from Back/Forward cache)
window.addEventListener('pageshow', function (event) {
  if (event.persisted) {
    // If restored from cache, hide loader immediately
    hideLoader();
  }
});

// 4. Navigation Exit - Instant Show (No Fade In)
document.addEventListener('DOMContentLoaded', function () {
  const links = document.querySelectorAll('a[href]');
  links.forEach(link => {
    link.addEventListener('click', function (e) {
      if (this.dataset && this.dataset.noLoader === 'true') return;

      const href = this.getAttribute('href');
      // Filter out internal anchors, JS, mailto, new tab
      if (
        href &&
        !href.startsWith('#') &&
        !href.startsWith('javascript:') &&
        !href.startsWith('mailto:') &&
        !href.startsWith('tel:') &&
        (!this.target || this.target !== '_blank')
      ) {
        const loader = document.getElementById('pageLoader');
        if (loader) {
          // FORCE INSTANT SHOW - Remove transition temporary
          loader.style.transition = 'none';
          loader.style.display = 'flex';
          loader.classList.remove('hidden');
          loader.style.opacity = '1';

          // Restore transition for next time? Not strictly needed as page will unload.
        }
      }
    });
  });
});
