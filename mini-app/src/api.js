import axios from 'axios';
import { getInitData } from './telegram';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  config.headers['X-Telegram-Init-Data'] = getInitData();
  return config;
});

export default api;
