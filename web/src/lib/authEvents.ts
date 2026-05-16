/** Dong bo Navbar / trang sau khi auth state thay doi. */
export const AUTH_CHANGE_EVENT = 'cook-auth-change';

export type AuthChangeDetail = {
  authenticated?: boolean;
};

export function getAuthChangeDetail(event: Event): AuthChangeDetail {
  return event instanceof CustomEvent && typeof event.detail === 'object' && event.detail !== null
    ? (event.detail as AuthChangeDetail)
    : {};
}

export function notifyAuthChanged(detail: AuthChangeDetail = {}): void {
  window.dispatchEvent(new CustomEvent<AuthChangeDetail>(AUTH_CHANGE_EVENT, { detail }));
}
