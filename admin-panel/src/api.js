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

// Internetga chiqarilgan backend. Lokal ishlaganda Vite proxy ishlatiladi.
const PRODUCTION_API = 'https://pizza-delivery-backend-7ipz.onrender.com/api/admin';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api/admin' : PRODUCTION_API),
});

api.interceptors.request.use((config) => {
  config.headers['x-admin-key'] = getAdminKey();
  return config;
});

export default api;
