import type { ResolvedTheme } from '../hooks/useEffectiveTheme';
import type { ThemeTokens } from './types';
import { darkTheme } from './dark';
import { lightTheme } from './light';

// Theme registry. Add a new theme = new file implementing ThemeTokens +
// extend ResolvedTheme + register here. Consumers use useTheme() unchanged.
export const THEMES = {
  dark: darkTheme,
  light: lightTheme,
} satisfies Record<ResolvedTheme, ThemeTokens>;

export type { ThemeTokens } from './types';
