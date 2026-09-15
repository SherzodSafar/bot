import axios from 'axios';
import { getInitData } from './telegram';

// Internetga chiqarilgan backend. Lokal ishlaganda Vite proxy ishlatiladi.
const PRODUCTION_API = 'https://pizza-delivery-backend-7ipz.onrender.com/api/client';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api/client' : PRODUCTION_API),
});

api.interceptors.request.use((config) => {
  config.headers['X-Telegram-Init-Data'] = getInitData();
  config.headers['ngrok-skip-browser-warning'] = 'true';
  return config;
});

export default api;
