import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  withCredentials: true,
});

// Attach auth token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dp_token');
  if (token) config.headers.Authorization = `Token ${token}`;

  // Forward user's AI API key if stored
  const aiKey = sessionStorage.getItem('dp_ai_key');
  if (aiKey) config.headers['X-AI-Api-Key'] = aiKey;

  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('dp_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
