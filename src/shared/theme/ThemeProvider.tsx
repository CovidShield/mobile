import React, {useEffect, useState} from 'react';
import {useStorage} from 'services/StorageService';
import {ThemeProvider as ThemeProviderRS} from '@shopify/restyle';
import {Region} from 'shared/Region';

import defaultTheme, {Theme} from './default';

interface ThemeProviderProps {
  children?: React.ReactElement;
}

export const ThemeProvider = ({children}: ThemeProviderProps) => {
  // Need to also get value for light/dark theme from storage
  const {region} = useStorage();
  const [theme, setTheme] = useState<Theme>(getThemeWithDefault(region));

  useEffect(() => setTheme(getThemeWithDefault(region)), [region]);

  return <ThemeProviderRS theme={theme}>{children}</ThemeProviderRS>;
};

const getThemeWithDefault = (region?: Region, mode: 'light' | 'dark' = 'light'): Theme => {
  return region ? themes[region][mode] : themes.None[mode];
};

// Add different themes into this map
const themes: Record<Region, {light: Theme; dark: Theme}> = {
  None: {
    light: defaultTheme,
    dark: defaultTheme,
  },
  GSU: {
    light: defaultTheme,
    dark: defaultTheme,
  },
  GST: {
    light: defaultTheme,
    dark: defaultTheme,
  },
  GT: {
    light: defaultTheme,
    dark: defaultTheme,
  },
  KSU: {
    light: defaultTheme,
    dark: defaultTheme,
  },
  UGA: {
    light: defaultTheme,
    dark: defaultTheme,
  },
  UWG: {
    light: defaultTheme,
    dark: defaultTheme,
  },
  VSU: {
    light: defaultTheme,
    dark: defaultTheme,
  },
};
