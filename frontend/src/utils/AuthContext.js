import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('dp_token');
    if (token) {
      api.get('/auth/me/')
        .then(r => setUser(r.data))
        .catch(() => localStorage.removeItem('dp_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login/', { username, password });
    localStorage.setItem('dp_token', data.token);
    setUser(data.user);
    return data;
  };

  const register = async (username, email, password, password2) => {
    const { data } = await api.post('/auth/register/', { username, email, password, password2 });
    localStorage.setItem('dp_token', data.token);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try { await api.post('/auth/logout/'); } catch (_) {}
    localStorage.removeItem('dp_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
