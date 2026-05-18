import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useSettingsStore } from './settingsStore';

const RESET: Partial<ReturnType<typeof useSettingsStore.getState>> = {
  fontFamily: 'Inter',
  fontSize: 14,
  italicizeSystem: true,
  useColoredBackground: false,
  disabledChannels: new Set<string>(),
  trustedDomains: new Set<string>(),
  filters: [],
  folders: [],
  tellModeAll: true,
  ctrlEnterToSend: false,
  emoteConfirm: true,
  emoteSortByName: false,
  retainSyncSendPrefix: true,
  largeLinkPreviews: false,
};

describe('useSettingsStore', () => {
  beforeEach(() => {
    act(() => useSettingsStore.getState().hydrate(RESET));
  });

  it('updates fontFamily via setter', () => {
    act(() => useSettingsStore.getState().setFontFamily('Noto Sans JP'));
    expect(useSettingsStore.getState().fontFamily).toBe('Noto Sans JP');
  });

  it('hydrate applies a partial patch without touching other fields', () => {
    act(() => useSettingsStore.getState().hydrate({ italicizeSystem: false, fontSize: 18 }));
    const s = useSettingsStore.getState();
    expect(s.italicizeSystem).toBe(false);
    expect(s.fontSize).toBe(18);
    expect(s.fontFamily).toBe('Inter'); // untouched
  });

  it('functional setter for trustedDomains updates from previous value', () => {
    act(() =>
      useSettingsStore.getState().setTrustedDomains((prev) => new Set([...prev, 'example.com'])),
    );
    expect(useSettingsStore.getState().trustedDomains.has('example.com')).toBe(true);
  });
});
