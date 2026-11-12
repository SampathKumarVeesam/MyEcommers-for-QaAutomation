import React, { createContext, useContext, useEffect, useState } from 'react';
import { Address, User } from '../types.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (data: { name: string; email: string; password: string; phone?: string }) => Promise<{ success: boolean; message?: string; errors?: Record<string, string> }>;
  loginWithOAuth: (provider: 'google' | 'apple', profile?: { name?: string; email?: string }) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  quickLogin: (account: 'admin' | 'customer1' | 'customer2') => Promise<void>;
  updateUserAddress: (address: Address) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'shopsphere_auth_token';
const USER_KEY = 'shopsphere_auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY) || null;
  });

  const [loading, setLoading] = useState<boolean>(true);

  // Validate token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/users/me', {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setUser(json.data);
            localStorage.setItem(USER_KEY, JSON.stringify(json.data));
          } else {
            logout();
          }
        } else {
          logout();
        }
      } catch (err) {
        console.error('Error verifying auth session:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setUser(json.data.user);
        setToken(json.data.token);
        localStorage.setItem(TOKEN_KEY, json.data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(json.data.user));
        return { success: true };
      }

      return {
        success: false,
        message: json.message || 'Invalid email or password',
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error during login' };
    }
  };

  const register = async (data: { name: string; email: string; password: string; phone?: string }) => {
    try {
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (res.status === 201 && json.success) {
        setUser(json.data.user);
        setToken(json.data.token);
        localStorage.setItem(TOKEN_KEY, json.data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(json.data.user));
        return { success: true };
      }

      return {
        success: false,
        message: json.message || 'Registration failed',
        errors: json.errors,
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error during registration' };
    }
  };

  const loginWithOAuth = async (
    provider: 'google' | 'apple',
    profile?: { name?: string; email?: string }
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch('/api/users/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          name: profile?.name,
          email: profile?.email,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setUser(json.data.user);
        setToken(json.data.token);
        localStorage.setItem(TOKEN_KEY, json.data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(json.data.user));
        return { success: true };
      }

      return {
        success: false,
        message: json.message || `Failed to authenticate with ${provider}`,
      };
    } catch (err: any) {
      return { success: false, message: err.message || `Network error during ${provider} authentication` };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const quickLogin = async (account: 'admin' | 'customer1' | 'customer2') => {
    if (account === 'admin') {
      await login('admin@practicesoftwaretesting.com', 'welcome01');
    } else if (account === 'customer1') {
      await login('customer@practicesoftwaretesting.com', 'User01');
    } else if (account === 'customer2') {
      await login('customer2@practicesoftwaretesting.com', 'User02');
    }
  };

  const updateUserAddress = (address: Address) => {
    if (!user) return;
    const updated = { ...user, address };
    setUser(updated);
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isAdmin: user?.role === 'admin',
        loading,
        login,
        register,
        loginWithOAuth,
        logout,
        quickLogin,
        updateUserAddress,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
