const AUTH_KEY = 'cookingboy_user';

/**
 * Tên file: auth.js
 * Công dụng: Service quản lý trạng thái xác thực client-side.
 * Chức năng: 
 * - Lưu/Lấy User info từ LocalStorage.
 * - Kiểm tra trạng thái đăng nhập (isAuthenticated).
 * - Xử lý Logout.
 */
const AuthService = {
  user: null,

  init() {
    this.user = this.getStoredUser();
    this.updateUI();
    this.bindLogoutButtons();
    this.syncSession();
    window.addEventListener('storage', (event) => {
      if (event.key === AUTH_KEY) {
        this.user = this.getStoredUser();
        this.updateUI();
      }
    });
  },

  getStoredUser() {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setUser(user) {
    this.user = user;
    if (user) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_KEY);
    }
    this.updateUI();
  },

  async syncSession() {
    try {
      const data = await apiRequest('auth/me.php');
      if (data.authenticated) {
        this.setUser(data.user);
      } else if (!data.authenticated) {
        this.setUser(null);
      }
    } catch (error) {
      console.warn('Không thể đồng bộ phiên đăng nhập:', error);
    }
  },

  async login(credentials) {
    const response = await apiRequest('auth/login.php', {
      method: 'POST',
      body: credentials,
    });
    this.setUser(response.user);
    return response;
  },

  async register(payload) {
    const response = await apiRequest('auth/register.php', {
      method: 'POST',
      body: payload,
    });
    this.setUser(response.user);
    return response;
  },

  async logout() {
    await apiRequest('auth/logout.php', { method: 'POST' });
    this.setUser(null);
  },

  isAuthenticated() {
    return !!this.user;
  },

  bindLogoutButtons() {
    const logoutButtons = Array.from(document.querySelectorAll('.js-auth-logout'));
    logoutButtons.forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          btn.disabled = true;
          await this.logout();
        } catch (error) {
          alert(error.message);
        } finally {
          btn.disabled = false;
        }
      });
    });
  },

  updateUI() {
    const loginGroups = document.querySelectorAll('.js-auth-login-group');
    const userGroups = document.querySelectorAll('.js-auth-user-group');
    const nameEls = document.querySelectorAll('.js-auth-name');
    const avatarImgs = document.querySelectorAll('.js-auth-avatar');
    const avatarFallbacks = document.querySelectorAll('.js-auth-avatar-fallback');
    const body = document.body;

    loginGroups.forEach((group) => {
      group.classList.toggle('hidden', this.isAuthenticated());
    });
    userGroups.forEach((group) => {
      group.classList.toggle('hidden', !this.isAuthenticated());
    });
    const displayName = this.user
      ? ((this.user.full_name && this.user.full_name.trim()) || this.user.email || '')
      : '';
    nameEls.forEach((el) => {
      el.textContent = displayName;
    });

    const hasAvatar = !!(this.user && this.user.avatar_url);
    const fallbackSource = displayName || (this.user ? this.user.email || '' : '');
    const fallbackChar = fallbackSource.trim().charAt(0).toUpperCase();

    avatarImgs.forEach((img) => {
      if (hasAvatar) {
        img.src = this.user.avatar_url;
        img.classList.remove('hidden');
      } else {
        img.classList.add('hidden');
      }
    });

    avatarFallbacks.forEach((fallback) => {
      if (!hasAvatar && fallbackChar) {
        fallback.textContent = fallbackChar;
        fallback.classList.remove('hidden');
      } else {
        fallback.textContent = '';
        fallback.classList.add('hidden');
      }
    });

    if (body) {
      body.setAttribute('data-logged-in', this.isAuthenticated() ? 'true' : 'false');
    }
  },
};

document.addEventListener('DOMContentLoaded', () => {
  AuthService.init();
});

window.AuthService = AuthService;
