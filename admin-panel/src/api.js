import axios from 'axios';

const KEY_STORAGE = 'admin_key';

export function getAdminKey() {
  try {
    return localStorage.getItem(KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function setAdminKey(key) {
  try {
    localStorage.setItem(KEY_STORAGE, key);
  } catch {
    /* localStorage mavjud emas */
  }
}

export function clearAdminKey() {
  try {
    localStorage.removeItem(KEY_STORAGE);
  } catch {
    /* localStorage mavjud emas */
  }
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/admin',
});

api.interceptors.request.use((config) => {
  config.headers['x-admin-key'] = getAdminKey();
  return config;
});

export default api;
