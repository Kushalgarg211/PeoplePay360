import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthUser, UserRole } from '../types';
import api from '../lib/api';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (role: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('pp360_token');
    const storedUser = localStorage.getItem('pp360_user');
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('pp360_token');
        localStorage.removeItem('pp360_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      
      const { token: jwtToken, user: backendUser } = response.data.data;

      const authUser: AuthUser = {
        id: backendUser.id,
        name: backendUser.employee 
          ? `${backendUser.employee.firstName} ${backendUser.employee.lastName}`
          : backendUser.email.split('@')[0],
        email: backendUser.email,
        role: (backendUser.role || '').toLowerCase() as UserRole,
        employeeId: backendUser.employee?.id || undefined,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${backendUser.email}`,
      };

      setUser(authUser);
      setToken(jwtToken);
      localStorage.setItem('pp360_token', jwtToken);
      localStorage.setItem('pp360_user', JSON.stringify(authUser));
    } catch (err) {
      throw new Error('Invalid email or password');
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('pp360_token');
    localStorage.removeItem('pp360_user');
  }, []);

  const hasRole = useCallback(
    (role: UserRole) => user?.role === role,
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, isLoading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
