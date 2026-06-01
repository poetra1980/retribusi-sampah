import { createContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/authApi';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await authApi.me();
      setUser(data.data.user);
      setRoles(data.data.roles || []);
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const login = async (credentials) => {
    const { data } = await authApi.login(credentials);
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    setUser(data.data.user);
    setRoles(data.data.roles || []);
    return data.data;
  };

  const logout = async () => {
    try {
      const rt = localStorage.getItem('refreshToken');
      if (rt) await authApi.logout(rt);
    } catch {
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setRoles([]);
      window.location.href = '/login';
    }
  };

  const hasRole = (role) => roles.some((r) => r.toLowerCase() === role.toLowerCase());

  const hasAnyRole = (...allowed) => allowed.some((r) => hasRole(r));

  return (
    <AuthContext.Provider value={{ user, roles, loading, login, logout, hasRole, hasAnyRole, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
