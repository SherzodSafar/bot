import axios from 'axios';
import { getInitData } from './telegram';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/client',
});

api.interceptors.request.use((config) => {
  config.headers['X-Telegram-Init-Data'] = getInitData();
  config.headers['ngrok-skip-browser-warning'] = 'true';
  return config;
});

export default api;
