import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthUser, UserRole } from '../types';
import { demoAccounts } from '../data/mockData';

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
    // Mock auth — matches demo credentials, falls back to API attempt
    const demo = demoAccounts.find(
      (a) => a.email === email && a.password === password
    );

    if (demo) {
      const authUser: AuthUser = {
        id: `user_${demo.role}`,
        name: demo.name,
        email: demo.email,
        role: demo.role as UserRole,
        employeeId: demo.employeeId,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${demo.name}`,
      };
      const mockToken = `mock_jwt_${Date.now()}`;
      setUser(authUser);
      setToken(mockToken);
      localStorage.setItem('pp360_token', mockToken);
      localStorage.setItem('pp360_user', JSON.stringify(authUser));
      return;
    }

    // Real API fallback
    try {
      const response = await fetch('http://localhost:5000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) throw new Error('Invalid credentials');
      const data = await response.json();
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('pp360_token', data.token);
      localStorage.setItem('pp360_user', JSON.stringify(data.user));
    } catch {
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
