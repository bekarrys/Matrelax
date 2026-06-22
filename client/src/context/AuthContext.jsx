import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.auth.verify()
        .then((data) => {
          setUser({ email: data.email, role: data.role, uid: data.uid, token });
        })
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await api.auth.login(credentials);
    localStorage.setItem('token', data.token);
    // refreshToken нужен, чтобы продлевать сессию после протухания id-токена (1 час).
    if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
    setUser({ email: data.email, role: data.role, displayName: data.displayName, token: data.token });
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setUser(null);
  }, []);

  const isAuthenticated = !!user;

  // Хелперы для проверки роли в компонентах
  const hasRole = useCallback((...roles) => roles.includes(user?.role), [user]);
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const isExecutor = user?.role === 'executor';

  return (
    <AuthContext.Provider value={{
      user, loading, isAuthenticated,
      login, logout, hasRole,
      isAdmin, isManager, isExecutor,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
