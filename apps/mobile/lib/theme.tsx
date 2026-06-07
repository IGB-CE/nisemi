import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  darkColors,
  lightColors,
  darkGradient,
  lightGradient,
  makeTypography,
  type Palette,
  type Gradients,
  type Typography,
} from './colors';

export type ThemePreference = 'system' | 'light' | 'dark';
export type Scheme = 'light' | 'dark';

export interface Theme {
  scheme: Scheme;
  colors: Palette;
  gradient: Gradients;
  typography: Typography;
}

interface ThemeContextType extends Theme {
  /** User's stored choice. 'system' follows the phone's appearance setting. */
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  /** Flip to the opposite scheme and store it as an explicit override. */
  toggle: () => void;
}

const PREF_KEY = 'theme_preference';

const darkTheme: Theme = {
  scheme: 'dark',
  colors: darkColors,
  gradient: darkGradient,
  typography: makeTypography(darkColors),
};

const lightTheme: Theme = {
  scheme: 'light',
  colors: lightColors,
  gradient: lightGradient,
  typography: makeTypography(lightColors),
};

const ThemeContext = createContext<ThemeContextType>({
  ...darkTheme,
  preference: 'system',
  setPreference: () => {},
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme(); // 'light' | 'dark' | null
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    (async () => {
      const stored = await SecureStore.getItemAsync(PREF_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setPreferenceState(stored);
      }
    })();
  }, []);

  const setPreference = (p: ThemePreference) => {
    setPreferenceState(p);
    SecureStore.setItemAsync(PREF_KEY, p).catch(() => {});
  };

  // Push an explicit override down to native components (keyboard, date picker,
  // system alerts). `null` hands control back to the OS appearance setting.
  useEffect(() => {
    Appearance.setColorScheme(preference === 'system' ? null : preference);
  }, [preference]);

  const scheme: Scheme = preference === 'system' ? (system === 'light' ? 'light' : 'dark') : preference;

  const value = useMemo<ThemeContextType>(() => {
    const base = scheme === 'light' ? lightTheme : darkTheme;
    return {
      ...base,
      preference,
      setPreference,
      toggle: () => setPreference(scheme === 'light' ? 'dark' : 'light'),
    };
  }, [scheme, preference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
export const useColors = () => useContext(ThemeContext).colors;

/**
 * Build a StyleSheet from the active theme. Pass a factory that takes the theme
 * (destructure `{ colors, typography, gradient }`) and returns StyleSheet.create(...).
 * Styles are memoized per scheme so they only rebuild on a theme change.
 */
export function useThemedStyles<T>(factory: (t: Theme) => T): T {
  const { scheme, colors, gradient, typography } = useContext(ThemeContext);
  return useMemo(() => factory({ scheme, colors, gradient, typography }), [scheme]);
}
