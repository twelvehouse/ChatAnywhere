// localStorage cache for the boot-time theme. Needed because the passcode
// screen renders before /settings (auth-gated) can be fetched. This is the
// only persistent setting not stored server-side, by necessity.

import type { ThemeMode } from '../store/settingsStore';

export const THEME_CACHE_KEY = 'ca-theme';

function readCachedTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_CACHE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* localStorage disabled */
  }
  return 'system';
}

export function resolveSystemTheme(): 'light' | 'dark' {
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function bootstrapTheme(): ThemeMode {
  const mode = readCachedTheme();
  const resolved = mode === 'system' ? resolveSystemTheme() : mode;
  document.body.className = `theme-${resolved}`;
  return mode;
}

export function cacheTheme(theme: ThemeMode): void {
  try {
    localStorage.setItem(THEME_CACHE_KEY, theme);
  } catch {
    /* localStorage disabled */
  }
}
