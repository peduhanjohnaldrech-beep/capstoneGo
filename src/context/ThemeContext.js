import React, { createContext, useContext, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext({});
export const useTheme = () => useContext(ThemeContext);

export const LIGHT = {
  primary: '#4F46E5',
  primaryLight: '#818CF8',
  primaryDark: '#3730A3',
  secondary: '#10B981',
  accent: '#F59E0B',
  danger: '#EF4444',
  warning: '#F97316',
  success: '#22C55E',
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#1E293B',
  textSecondary: '#64748B',
  textLight: '#94A3B8',
  border: '#E2E8F0',
  white: '#FFFFFF',
  black: '#000000',
  notStarted: '#94A3B8',
  inProgress: '#F59E0B',
  forReview: '#3B82F6',
  done: '#22C55E',
  timerGreen: '#22C55E',
  timerYellow: '#F59E0B',
  timerRed: '#EF4444',
};

export const DARK = {
  primary: '#818CF8',
  primaryLight: '#A5B4FC',
  primaryDark: '#4F46E5',
  secondary: '#10B981',
  accent: '#F59E0B',
  danger: '#EF4444',
  warning: '#F97316',
  success: '#22C55E',
  background: '#0F172A',
  card: '#1E293B',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textLight: '#64748B',
  border: '#334155',
  white: '#FFFFFF',
  black: '#000000',
  notStarted: '#64748B',
  inProgress: '#F59E0B',
  forReview: '#3B82F6',
  done: '#22C55E',
  timerGreen: '#22C55E',
  timerYellow: '#F59E0B',
  timerRed: '#EF4444',
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const loadTheme = async () => {
    const saved = await AsyncStorage.getItem('theme');
    if (saved === 'dark') setIsDark(true);
  };

  React.useEffect(() => { loadTheme(); }, []);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors: isDark ? DARK : LIGHT }}>
      {children}
    </ThemeContext.Provider>
  );
};
