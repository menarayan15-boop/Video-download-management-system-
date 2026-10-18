import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserSubscription, QuotaSummary } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  subscription: UserSubscription | null;
  quota: QuotaSummary | null;
  isLoading: boolean;
  login: (token: string, user: User, subscription?: UserSubscription) => void;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  refreshQuota: () => Promise<void>;
  isCreator: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [quota, setQuota] = useState<QuotaSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshQuota = useCallback(async () => {
    try {
      if (localStorage.getItem('vyntra_token')) {
        const q = await api.getQuota();
        setQuota(q);
      }
    } catch (e) {
      // Quiet fail if not logged in
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('vyntra_token');
      if (!token) {
        setUser(null);
        setSubscription(null);
        setQuota(null);
        setIsLoading(false);
        return;
      }

      const res = await api.getMe();
      if (res && res.user) {
        setUser(res.user);
        setSubscription(res.subscription);
        await refreshQuota();
      } else {
        localStorage.removeItem('vyntra_token');
        setUser(null);
      }
    } catch (e) {
      localStorage.removeItem('vyntra_token');
      setUser(null);
      setSubscription(null);
      setQuota(null);
    } finally {
      setIsLoading(false);
    }
  }, [refreshQuota]);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const login = (token: string, newUser: User, newSub?: UserSubscription) => {
    localStorage.setItem('vyntra_token', token);
    setUser(newUser);
    if (newSub) setSubscription(newSub);
    refreshQuota();
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem('vyntra_token');
      setUser(null);
      setSubscription(null);
      setQuota(null);
    }
  };

  const isCreator = user?.role === 'CREATOR' || user?.role === 'ADMIN';
  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        subscription,
        quota,
        isLoading,
        login,
        logout,
        refreshAuth,
        refreshQuota,
        isCreator,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
