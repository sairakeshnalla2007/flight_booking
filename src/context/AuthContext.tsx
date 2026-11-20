import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

export interface AppUser {
  userId: number;
  email: string;
  name: string;
}

interface AuthContextValue {
  user: AppUser | null;
  authLoading: boolean;
  authError: string | null;
  register: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      })
      .catch(() => {})
      .finally(() => setAuthLoading(false));
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      setAuthError(null);
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setAuthError(data.error || 'Registration failed.');
          throw new Error(data.error || 'Registration failed');
        }
        setUser(data.user);
      } catch (err: any) {
        if (!authError) setAuthError(err?.message || 'Registration failed.');
        throw err;
      }
    },
    []
  );

  const login = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Login failed.');
        throw new Error(data.error || 'Login failed');
      }
      setUser(data.user);
    } catch (err: any) {
      if (!authError) setAuthError(err?.message || 'Login failed.');
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthError(null);
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        authLoading,
        authError,
        register,
        login,
        logout,
        isAuthenticated: user !== null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
