/**
 * Tên file: navbarActive.js
 * Công dụng: Quản lý trạng thái Active của Navbar.
 * Chức năng: 
 * - Tự động highlight link tương ứng với trang hiện tại.
 * - Xử lý hiệu ứng underline/màu sắc cho menu item.
 */
function initNavbarActive() {
  const navLinks = Array.from(document.querySelectorAll('.nav-link'));
  const mobileLinks = Array.from(document.querySelectorAll('#mobileMenu a'));

  // Normalize path: unify slashes and treat /index.php as folder root
  const normalizePath = (p) =>
    p.replace(/\\/g, '/')
      .replace(/\/index\.php$/i, '/')
      .replace(/\/index\.html$/i, '/')
      .replace(/\/+/g, '/');

  const currentPath = normalizePath(window.location.pathname);

  function clearActive() {
    navLinks.forEach((link) => link.classList.remove('active'));
    mobileLinks.forEach((link) => link.classList.remove('active'));
  }

  function markActive(link) {
    if (!link) return;
    link.classList.add('active');
  }

  function setCurrentByComparison() {
    // Compare using resolved absolute href to be robust with .. paths
    const allLinks = [...navLinks, ...mobileLinks];
    let matched = false;

    allLinks.forEach((a) => {
      try {
        const url = new URL(a.href);
        const linkPath = normalizePath(url.pathname);
        if (linkPath === currentPath) {
          a.classList.add('active');
          matched = true;
        }
      } catch (_) {
        // ignore malformed hrefs
      }
    });

    // Fallback by section if nothing matched exactly (e.g., detail pages)
    if (!matched) {
      const sectionMatchers = [
        { test: /\/home\//, sel: ['[href*="home/index.php"]'] },
        { test: /\/recipes\//, sel: ['[href*="recipes/index.php"]'] },
        { test: /\/blog\//, sel: ['[href*="blog/index.php"]'] },
        { test: /\/health\//, sel: ['[href*="health/index.php"]'] },
        { test: /about(\.php)?$/i, sel: ['[href*="about.php"]'] },
      ];

      for (const m of sectionMatchers) {
        if (m.test.test(currentPath)) {
          m.sel.forEach((selector) => {
            const desktopLink = navLinks.find(link => link.matches(selector));
            const mobileLink = mobileLinks.find(link => link.matches(selector));
            if (desktopLink) markActive(desktopLink);
            if (mobileLink) markActive(mobileLink);
          });
          break;
        }
      }
    }
  }

  // Pre-highlight on click for instant feedback
  function preHighlightOnClick(links) {
    links.forEach((link) => {
      link.addEventListener('click', () => {
        clearActive();
        link.classList.add('active');
      });
    });
  }

  clearActive();
  setCurrentByComparison();
  preHighlightOnClick(navLinks);
  preHighlightOnClick(mobileLinks);
}

document.addEventListener('DOMContentLoaded', initNavbarActive);