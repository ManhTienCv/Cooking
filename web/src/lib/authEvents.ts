/** Đồng bộ Navbar / trang sau khi đăng xuất hoặc đăng nhập ở nơi khác. */
export const AUTH_CHANGE_EVENT = 'cook-auth-change';

export function notifyAuthChanged(): void {
  window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT));
}
