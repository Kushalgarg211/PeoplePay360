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

      // A successful login has just claimed the account's single session slot —
      // drop any stale "you were signed out" notice so it can't reappear.
      sessionStorage.removeItem('pp360_logout_reason');

      setUser(authUser);
      setToken(jwtToken);
      localStorage.setItem('pp360_token', jwtToken);
      localStorage.setItem('pp360_user', JSON.stringify(authUser));
    } catch (err: any) {
      // Surface what the server actually said (e.g. "Account is inactive")
      // instead of masking every failure as bad credentials.
      throw new Error(err?.response?.data?.message || 'Invalid email or password');
    }
  }, []);

  /** Drop local session state without calling the API. */
  const clearLocal = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('pp360_token');
    localStorage.removeItem('pp360_user');
  }, []);

  const logout = useCallback(() => {
    // Release the server-side session slot; best-effort, never blocks sign-out.
    api.post('/auth/logout').catch(() => {});
    clearLocal();
  }, [clearLocal]);

  // ─── Single-device heartbeat ───────────────────────────────────────────────
  // Without this, a device whose session was taken over by a newer login keeps
  // *displaying* the app until the user clicks something (every request it makes
  // already fails). Polling /auth/me surfaces the takeover on its own.
  //
  // Note the response interceptor deliberately skips its redirect for /auth/*
  // URLs, so the 401 is handled here: clearing state lets AuthGuard navigate to
  // /login, and the interceptor has already stored the reason for LoginPage.
  useEffect(() => {
    if (!token) return;

    const id = setInterval(() => {
      api.get('/auth/me').catch((err) => {
        if (err?.response?.status === 401) clearLocal();
      });
    }, 60_000);

    return () => clearInterval(id);
  }, [token, clearLocal]);

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
