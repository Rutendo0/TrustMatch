import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { COLORS } from '../constants/theme';

// ─── Dark palette ─────────────────────────────────────────────────────────────
export const DARK_COLORS = {
  primary: '#EF4444',
  primaryDark: '#DC2626',
  primaryLight: '#F87171',
  primarySoft: '#3B1212',

  secondary: '#F43F5E',
  secondaryDark: '#E11D48',
  secondaryLight: '#FB7185',

  accent: '#BE123C',
  accentDark: '#9F1239',
  accentLight: '#E11D48',

  white: '#1F2937',
  offWhite: '#111827',
  background: '#111827',
  backgroundWarm: '#1C1010',
  backgroundGray: '#1F2937',
  card: '#1F2937',
  text: '#F9FAFB',
  textSecondary: '#9CA3AF',
  textLight: '#6B7280',
  border: '#374151',
  borderLight: '#1F2937',

  success: '#10B981',
  successLight: '#064E3B',
  warning: '#F59E0B',
  warningLight: '#451A03',
  error: '#EF4444',
  errorLight: '#3B1212',
  info: '#3B82F6',
  infoLight: '#1E3A5F',

  verified: '#10B981',
  verifiedBg: 'rgba(16, 185, 129, 0.15)',
  unverified: '#F59E0B',
  trustScore: '#EF4444',
  trustScoreBg: 'rgba(239, 68, 68, 0.15)',

  premium: '#F59E0B',
  premiumBg: 'rgba(245, 158, 11, 0.15)',
  diamond: '#BE123C',
  diamondBg: 'rgba(190, 18, 60, 0.15)',

  gradientStart: '#EF4444',
  gradientMiddle: '#E11D48',
  gradientEnd: '#F43F5E',

  trustShield: '#059669',
  safetyGreen: '#10B981',

  shadow: '#000000',
  shadowLight: 'rgba(0, 0, 0, 0.3)',
  shadowMedium: 'rgba(0, 0, 0, 0.4)',
  shadowRed: 'rgba(239, 68, 68, 0.25)',

  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.5)',
  overlayRed: 'rgba(239, 68, 68, 0.15)',
};

// ─── Light palette ────────────────────────────────────────────────────────────
export const LIGHT_COLORS = {
  primary: '#DC2626',
  primaryDark: '#B91C1C',
  primaryLight: '#EF4444',
  primarySoft: '#FEE2E2',

  secondary: '#F43F5E',
  secondaryDark: '#E11D48',
  secondaryLight: '#FB7185',

  accent: '#9F1239',
  accentDark: '#881337',
  accentLight: '#BE123C',

  white: '#FFFFFF',
  offWhite: '#FAFAFA',
  background: '#FFFFFF',
  backgroundWarm: '#FEF2F2',
  backgroundGray: '#F9FAFB',
  card: '#FFFFFF',
  text: '#1F2937',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#DC2626',
  errorLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',

  verified: '#10B981',
  verifiedBg: 'rgba(16, 185, 129, 0.1)',
  unverified: '#F59E0B',
  trustScore: '#DC2626',
  trustScoreBg: 'rgba(220, 38, 38, 0.1)',

  premium: '#F59E0B',
  premiumBg: 'rgba(245, 158, 11, 0.1)',
  diamond: '#9F1239',
  diamondBg: 'rgba(159, 18, 57, 0.1)',

  gradientStart: '#DC2626',
  gradientMiddle: '#E11D48',
  gradientEnd: '#F43F5E',

  trustShield: '#059669',
  safetyGreen: '#10B981',

  shadow: '#000000',
  shadowLight: 'rgba(0, 0, 0, 0.08)',
  shadowMedium: 'rgba(0, 0, 0, 0.12)',
  shadowRed: 'rgba(220, 38, 38, 0.2)',

  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  overlayRed: 'rgba(220, 38, 38, 0.1)',
};

export type ThemeColors = typeof LIGHT_COLORS;

// ─── Mutate the shared COLORS object so screens using COLORS pick up changes ──
function applyTheme(palette: ThemeColors) {
  (Object.keys(palette) as (keyof ThemeColors)[]).forEach((key) => {
    (COLORS as any)[key] = palette[key];
  });
}

interface ThemeContextValue {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
}

const THEME_KEY = 'trustmatch_dark_mode';

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  colors: LIGHT_COLORS,
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(THEME_KEY)
      .then(val => {
        if (val === 'dark') {
          applyTheme(DARK_COLORS);
          setIsDark(true);
        }
      })
      .catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      const palette = next ? DARK_COLORS : LIGHT_COLORS;
      applyTheme(palette);
      SecureStore.setItemAsync(THEME_KEY, next ? 'dark' : 'light').catch(() => {});
      return next;
    });
  }, []);

  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ThemeContext.Provider value={{ isDark, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
