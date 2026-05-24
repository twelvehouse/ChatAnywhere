import { create } from 'zustand';
import type { CustomFilter, FilterFolder } from '../types/filter';

export type ThemeMode = 'dark' | 'light' | 'system';

/**
 * Mirrors the C# FrontendSettings schema and is the single source of truth
 * for everything persisted via /settings (PUT/GET). Reply state and other
 * transient UI state belong in separate stores.
 */
export interface SettingsState {
  theme: ThemeMode;
  fontFamily: string;
  fontSize: number;
  italicizeSystem: boolean;
  useColoredBackground: boolean;
  disabledChannels: Set<string>;
  trustedDomains: Set<string>;
  filters: CustomFilter[];
  folders: FilterFolder[];
  tellModeAll: boolean;
  ctrlEnterToSend: boolean;
  emoteConfirm: boolean;
  emoteSortByName: boolean;
  retainSyncSendPrefix: boolean;
  largeLinkPreviews: boolean;
  sendDelayEnabled: boolean;
  sendDelaySeconds: number;
  sendDelayAlwaysQueue: boolean;
}

interface SettingsActions {
  setTheme: (v: ThemeMode) => void;
  setFontFamily: (v: string) => void;
  setFontSize: (v: number) => void;
  setItalicizeSystem: (v: boolean) => void;
  setUseColoredBackground: (v: boolean) => void;
  setDisabledChannels: (v: Set<string>) => void;
  setTrustedDomains: (v: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setFilters: (v: CustomFilter[] | ((prev: CustomFilter[]) => CustomFilter[])) => void;
  setFolders: (v: FilterFolder[] | ((prev: FilterFolder[]) => FilterFolder[])) => void;
  setTellModeAll: (v: boolean) => void;
  setCtrlEnterToSend: (v: boolean) => void;
  setEmoteConfirm: (v: boolean) => void;
  setEmoteSortByName: (v: boolean) => void;
  setRetainSyncSendPrefix: (v: boolean) => void;
  setLargeLinkPreviews: (v: boolean) => void;
  setSendDelayEnabled: (v: boolean) => void;
  setSendDelaySeconds: (v: number) => void;
  setSendDelayAlwaysQueue: (v: boolean) => void;
  /** Bulk-apply server-loaded values without triggering individual sets. */
  hydrate: (partial: Partial<SettingsState>) => void;
}

export const useSettingsStore = create<SettingsState & SettingsActions>((set) => ({
  theme: 'dark',
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
  sendDelayEnabled: false,
  sendDelaySeconds: 3,
  sendDelayAlwaysQueue: false,

  setTheme: (v) => set({ theme: v }),
  setFontFamily: (v) => set({ fontFamily: v }),
  setFontSize: (v) => set({ fontSize: v }),
  setItalicizeSystem: (v) => set({ italicizeSystem: v }),
  setUseColoredBackground: (v) => set({ useColoredBackground: v }),
  setDisabledChannels: (v) => set({ disabledChannels: v }),
  setTrustedDomains: (v) =>
    set((s) => ({ trustedDomains: typeof v === 'function' ? v(s.trustedDomains) : v })),
  setFilters: (v) => set((s) => ({ filters: typeof v === 'function' ? v(s.filters) : v })),
  setFolders: (v) => set((s) => ({ folders: typeof v === 'function' ? v(s.folders) : v })),
  setTellModeAll: (v) => set({ tellModeAll: v }),
  setCtrlEnterToSend: (v) => set({ ctrlEnterToSend: v }),
  setEmoteConfirm: (v) => set({ emoteConfirm: v }),
  setEmoteSortByName: (v) => set({ emoteSortByName: v }),
  setRetainSyncSendPrefix: (v) => set({ retainSyncSendPrefix: v }),
  setLargeLinkPreviews: (v) => set({ largeLinkPreviews: v }),
  setSendDelayEnabled: (v) => set({ sendDelayEnabled: v }),
  setSendDelaySeconds: (v) => set({ sendDelaySeconds: v }),
  setSendDelayAlwaysQueue: (v) => set({ sendDelayAlwaysQueue: v }),

  hydrate: (partial) => set(partial),
}));
