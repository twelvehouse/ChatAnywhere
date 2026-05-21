import { useEffectiveTheme } from './useEffectiveTheme';
import { THEMES, type ThemeTokens } from '../theme';

export function useTheme(): ThemeTokens {
  return THEMES[useEffectiveTheme()];
}
