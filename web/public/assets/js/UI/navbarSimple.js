/**
 * Tên file: navbarSimple.js
 * Công dụng: Logic cho Navbar (Mobile & Scroll).
 * Chức năng: 
 * - Xử lý toggle menu trên mobile.
 * - Xử lý hiệu ứng khi cuộn trang (đổi màu background navbar).
 */
function initSimpleNavbar() {
  // Guard against multiple initializations
  if (window.__SIMPLE_NAVBAR_INIT__) return;
  window.__SIMPLE_NAVBAR_INIT__ = true;

  const navbar = document.getElementById('navbar');
  const authContainer = document.getElementById('authContainer');
  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  let overlay = document.getElementById('mobileMenuOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'mobileMenuOverlay';
    document.body.appendChild(overlay);
  }

  if (!menuBtn || !mobileMenu) {
    return;
  }

  function handleScroll() {
    const scrollTop = window.pageYOffset;

    if (scrollTop > 50) {
      navbar.classList.add('navbar--light');
      navbar.classList.remove('navbar--dark');
    } else {
      navbar.classList.add('navbar--dark');
      navbar.classList.remove('navbar--light');
    }

    navbar.style.transform = 'translateY(0)';
    navbar.style.opacity = '1';
  }
  window.addEventListener('scroll', handleScroll);

  function toggleMenu(e) {
    e.preventDefault();
    e.stopPropagation();

    if (isMenuOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  function lockScroll() {
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  }
  function unlockScroll() {
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  }

  let isMenuOpen = false;

  function openMenu() {
    mobileMenu.style.maxHeight = '500px';
    mobileMenu.style.opacity = '1';
    mobileMenu.classList.remove('menu-closed');
    mobileMenu.classList.add('menu-open');
    menuBtn.innerHTML = '<i data-lucide="x" class="h-6 w-6"></i>';
    menuBtn.setAttribute('aria-expanded', 'true');
    mobileMenu.setAttribute('aria-hidden', 'false');
    overlay.classList.add('active');
    lockScroll();
    isMenuOpen = true;


    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    const menuItems = mobileMenu.querySelectorAll('.mobile-menu-item');
    menuItems.forEach((item, index) => {
      item.style.transitionDelay = `${index * 0.1}s`;
      item.classList.add('show');
    });
  }

  function closeMenu() {
    mobileMenu.style.maxHeight = '0px';
    mobileMenu.style.opacity = '0';
    mobileMenu.classList.remove('menu-open');
    mobileMenu.classList.add('menu-closed');
    menuBtn.innerHTML = '<i data-lucide="menu" class="h-6 w-6"></i>';
    menuBtn.setAttribute('aria-expanded', 'false');
    mobileMenu.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('active');
    unlockScroll();
    isMenuOpen = false;


    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    const menuItems = mobileMenu.querySelectorAll('.mobile-menu-item');
    menuItems.forEach(item => {
      item.classList.remove('show');
    });
  }

  // Add role-based links (Profile / Admin) if logged in
  async function renderRoleLinks() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const userData = localStorage.getItem('cookingboy_user');
      if (!userData) return;
      const user = JSON.parse(userData);

      // Resolve a page path relative to current folder
      const resolvePagePath = (page) => {
        const path = window.location.pathname.replace(/\\/g, '/');
        switch (page) {
          case 'index.html':
            return path.includes('/home/') ? 'index.php' : '../home/index.php';
          case 'admin.html':
            return path.includes('/admin/') ? 'index.php' : '../admin/index.php';
          case 'profile.html':
            return path.includes('/profile/') ? 'index.php' : '../profile/index.php';
          default:
            return page;
        }
      };

      const navigateTo = (page) => {
        window.location.href = resolvePagePath(page);
      };

      // Remove existing role links if any
      const existingLinks = document.getElementById('roleLinksContainer');
      if (existingLinks) existingLinks.remove();

      // Create container for Admin link (profile icon/greeting handled by auth.js)
      const roleLinksContainer = document.createElement('div');
      roleLinksContainer.id = 'roleLinksContainer';
      roleLinksContainer.className = 'hidden md:flex items-center space-x-3';

      // Admin link if admin
      if (user.role === 'admin') {
        const adminLink = document.createElement('a');
        adminLink.href = resolvePagePath('admin.html');
        adminLink.className = 'text-sm font-medium text-yellow-700 bg-yellow-100 px-3 py-1 rounded-full hover:bg-yellow-200 transition-colors';
        adminLink.innerHTML = `<i data-lucide="shield" class="h-4 w-4 inline mr-1"></i>Admin`;
        adminLink.addEventListener('click', (e) => { e.preventDefault(); navigateTo('admin.html'); });
        roleLinksContainer.appendChild(adminLink);
      }

      // Insert before menuBtn in authContainer
      if (authContainer && menuBtn) {
        authContainer.insertBefore(roleLinksContainer, menuBtn);
      }

      // Add Admin to mobile menu as well + Avatar with role color
      if (mobileMenu && user) {
        if (user.role === 'admin') {
          const mobileAdminLink = document.createElement('a');
          mobileAdminLink.href = resolvePagePath('admin.html');
          mobileAdminLink.className = 'mobile-menu-item block px-3 py-2 rounded-md text-base font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100';
          mobileAdminLink.innerHTML = `<i data-lucide="shield" class="h-5 w-5 inline mr-2"></i>Admin Dashboard`;
          mobileAdminLink.addEventListener('click', (e) => { e.preventDefault(); navigateTo('admin.html'); });
          mobileMenu.appendChild(mobileAdminLink);
        }


        // Add avatar with border color in mobile menu header area
        try {
          const role = user.role === 'admin' ? 'admin' : 'user';
          const borderClass = role === 'admin' ? 'border-yellow-500 ring-2 ring-yellow-200' : 'border-black';
          const avatarUrl = user.avatar_url || 'https://via.placeholder.com/40x40.png?text=%20';
          const avatarWrap = document.createElement('div');
          avatarWrap.className = 'flex items-center space-x-2 px-3 py-2';
          const img = document.createElement('img');
          img.src = avatarUrl;
          img.alt = 'Ảnh đại diện';
          img.className = `h-8 w-8 rounded-full object-cover border-2 ${borderClass}`;
          const name = document.createElement('span');
          name.className = 'text-sm font-medium text-gray-700';
          name.textContent = user.full_name || user.email || 'Người dùng';
          avatarWrap.appendChild(img);
          avatarWrap.appendChild(name);
          // insert at top of mobile menu
          mobileMenu.insertBefore(avatarWrap, mobileMenu.firstChild);
        } catch { }
      }

      // Recreate lucide icons
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    } catch (e) {
      console.error('Failed to render role links', e);
    }
  }
  renderRoleLinks();
  menuBtn.addEventListener('click', toggleMenu);
  overlay.addEventListener('click', closeMenu);
  document.addEventListener('click', function (e) {
    if (isMenuOpen && !mobileMenu.contains(e.target) && !menuBtn.contains(e.target)) {
      closeMenu();
    }
  });
  const menuLinks = mobileMenu.querySelectorAll('a, button');
  menuLinks.forEach(link => {
    link.addEventListener('click', function () {
      if (isMenuOpen) {
        setTimeout(closeMenu, 100);
      }
    });
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth >= 768 && isMenuOpen) {
      closeMenu();
    }
  });
  const anchorLinks = document.querySelectorAll('a[href^="#"]');
  anchorLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const targetElement = document.querySelector(targetId);

      if (targetElement) {
        const headerOffset = 80;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}
// Initialize once when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSimpleNavbar);
} else {
  initSimpleNavbar();
}