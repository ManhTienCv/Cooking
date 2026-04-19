/**
 * Tên file: api.js
 * Công dụng: Wrapper cho các gọi API fetch.
 * Chức năng: 
 * - Cung cấp hàm apiRequest dùng chung.
 * - Tự động xử lý URL backend (API_BASE).
 * - Tự động parse JSON và xử lý lỗi.
 */
const API_BASE = window.API_BASE_PATH || document.body?.dataset?.apiBase || '../../backend';

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
  const fetchOptions = {
    method: options.method || 'GET',
    headers: {
      Accept: 'application/json',
      'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
      ...(options.headers || {}),
    },
    credentials: 'include',
  };

  if (options.body !== undefined) {
    if (options.body instanceof FormData) {
      fetchOptions.body = options.body;
    } else if (typeof options.body === 'string') {
      fetchOptions.body = options.body;
      fetchOptions.headers['Content-Type'] = fetchOptions.headers['Content-Type'] || 'application/json';
    } else {
      fetchOptions.body = JSON.stringify(options.body);
      fetchOptions.headers['Content-Type'] = 'application/json';
    }
  }

  const response = await fetch(url, fetchOptions);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    const message = data.message || 'Đã có lỗi xảy ra. Vui lòng thử lại!';
    throw new Error(message);
  }

  return data;
}

window.apiRequest = apiRequest;
