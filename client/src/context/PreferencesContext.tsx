import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserPreference } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface PreferencesContextType {
  preferences: UserPreference;
  updatePreferences: (updates: Partial<UserPreference>) => Promise<void>;
  updatePreference: (key: keyof UserPreference, value: any) => Promise<void>;
  currentLang: string;
  setLanguage: (lang: string) => void;
}

const defaultPreferences: UserPreference = {
  preferredLanguage: 'en',
  language: 'en',
  captionsEnabled: false,
  reducedMotion: false,
  fontSize: 'medium',
  autoplay: true,
  soundOn: true,
  theme: 'dark',
  emailNotifications: true,
  inAppNotifications: true,
};

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreference>(() => {
    const cached = localStorage.getItem('vyntra_preferences');
    if (cached) {
      try {
        return { ...defaultPreferences, ...JSON.parse(cached) };
      } catch (e) {}
    }
    return defaultPreferences;
  });

  // Load from backend when authenticated
  useEffect(() => {
    if (user) {
      api.getUserPreferences()
        .then((res) => {
          if (res) {
            setPreferences((prev) => ({ ...prev, ...res }));
            localStorage.setItem('vyntra_preferences', JSON.stringify(res));
          }
        })
        .catch(() => {});
    }
  }, [user]);

  // Apply accessibility settings to HTML DOM
  useEffect(() => {
    const root = document.documentElement;

    // Font size
    root.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
    root.classList.add(`font-size-${preferences.fontSize || 'medium'}`);

    // High contrast theme
    if (preferences.theme === 'high-contrast') {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Reduced motion
    if (preferences.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }
  }, [preferences.fontSize, preferences.theme, preferences.reducedMotion]);

  const updatePreferences = async (updates: Partial<UserPreference>) => {
    const next = { ...preferences, ...updates };
    setPreferences(next);
    localStorage.setItem('vyntra_preferences', JSON.stringify(next));

    if (user) {
      try {
        await api.updateUserPreferences(updates);
      } catch (err) {
        console.error('Failed to save preferences to server:', err);
      }
    }
  };

  const updatePreference = async (key: keyof UserPreference, value: any) => {
    if (key === 'language') {
      await updatePreferences({ preferredLanguage: value, language: value });
    } else {
      await updatePreferences({ [key]: value });
    }
  };

  const setLanguage = (lang: string) => {
    updatePreferences({ preferredLanguage: lang, language: lang });
  };

  return (
    <PreferencesContext.Provider
      value={{
        preferences: {
          ...preferences,
          language: preferences.language || preferences.preferredLanguage || 'en',
        },
        updatePreferences,
        updatePreference,
        currentLang: preferences.preferredLanguage || 'en',
        setLanguage,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};
