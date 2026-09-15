import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  config.headers['x-admin-key'] = import.meta.env.VITE_ADMIN_KEY;
  return config;
});

export default api;
