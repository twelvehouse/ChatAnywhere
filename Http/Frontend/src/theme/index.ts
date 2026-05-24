import type { ResolvedTheme } from '../hooks/useEffectiveTheme';
import type { ThemeTokens } from './types';
import { darkTheme } from './dark';
import { lightTheme } from './light';

// Side-effect: load the CSS variable definitions for each theme.
import './dark.css';
import './light.css';

// Theme registry. Adding a new theme = new {name}.ts + {name}.css in this
// folder, an import line above, and a registration here. Extend ResolvedTheme
// to include the name. Consumers use useTheme() unchanged.
export const THEMES = {
  dark: darkTheme,
  light: lightTheme,
} satisfies Record<ResolvedTheme, ThemeTokens>;

export type { ThemeTokens } from './types';
