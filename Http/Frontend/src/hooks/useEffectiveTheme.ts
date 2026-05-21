import { useEffect, useState } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { resolveSystemTheme } from '../lib/themeBootstrap';

export type ResolvedTheme = 'light' | 'dark';

export function useEffectiveTheme(): ResolvedTheme {
  const theme = useSettingsStore((s) => s.theme);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(resolveSystemTheme);

  useEffect(() => {
    if (theme !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => setSystemTheme(mql.matches ? 'light' : 'dark');
    // Re-evaluate on switch *to* 'system' — the OS scheme may have changed
    // while we weren't listening.
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [theme]);

  if (theme === 'light') return 'light';
  if (theme === 'dark') return 'dark';
  return systemTheme;
}
