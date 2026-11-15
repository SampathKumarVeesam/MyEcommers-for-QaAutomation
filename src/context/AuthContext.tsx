import React, { createContext, useContext, useEffect, useState } from 'react';
import { Address, User } from '../types.js';
import { apiUrl } from '../config/api.js';

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
  updateUserAddress: (address: Address) => Promise<void>;
  updateProfile: (updates: { name?: string; phone?: string; avatar?: string; address?: Address }) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Only the bearer token is stored on the client for session authentication headers.
// 100% of user profile state, credentials, and roles are retrieved from PostgreSQL public.users.
const TOKEN_KEY = 'shopsphere_auth_token';

async function parseJsonResponse(res: Response): Promise<{ ok: boolean; status: number; data: any }> {
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    return { ok: res.ok, status: res.status, data };
  } catch {
    const msg = res.status === 504 
      ? 'Gateway Timeout: The server took too long to respond. Please try again.'
      : res.status === 502 || res.status === 503
      ? 'Backend service is spinning up. Please try again in a few moments.'
      : text || `Server returned status ${res.status}`;
    return { ok: false, status: res.status, data: { success: false, message: msg } };
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY) || null;
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Validate session against PostgreSQL public.users on mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(apiUrl('/api/users/me'), {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setUser(json.data);
            setToken(storedToken);
          } else {
            logout();
          }
        } else {
          logout();
        }
      } catch (err) {
        console.error('Error verifying PostgreSQL auth session:', err);
        logout();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch(apiUrl('/api/users/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const { ok, data: json } = await parseJsonResponse(res);
      if (ok && json.success) {
        setUser(json.data.user);
        setToken(json.data.token);
        localStorage.setItem(TOKEN_KEY, json.data.token);
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
      const res = await fetch(apiUrl('/api/users/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const { status, data: json } = await parseJsonResponse(res);
      if (status === 201 && json.success) {
        setUser(json.data.user);
        setToken(json.data.token);
        localStorage.setItem(TOKEN_KEY, json.data.token);
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
      const res = await fetch(apiUrl('/api/users/oauth'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          name: profile?.name,
          email: profile?.email,
        }),
      });

      const { ok, data: json } = await parseJsonResponse(res);
      if (ok && json.success) {
        setUser(json.data.user);
        setToken(json.data.token);
        localStorage.setItem(TOKEN_KEY, json.data.token);
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

  const updateProfile = async (updates: { name?: string; phone?: string; avatar?: string; address?: Address }): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch(apiUrl('/api/users/profile'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setUser(json.data);
          return true;
        }
      }
    } catch (err) {
      console.error('Failed to update profile in PostgreSQL:', err);
    }
    return false;
  };

  const updateUserAddress = async (address: Address) => {
    await updateProfile({ address });
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
        updateProfile,
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
