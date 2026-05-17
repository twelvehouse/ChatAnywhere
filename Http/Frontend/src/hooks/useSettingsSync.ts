import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RELAY_ADDR } from '../constants/config';
import type { CustomFilter, FilterFolder } from '../types/filter';
import { TRACKED_CHANNEL_TYPES } from '../constants/channels';
import { useSettingsStore, type SettingsState } from '../store/settingsStore';

const DEFAULT_FILTER: CustomFilter = {
  name: 'General',
  showChannelTypes: TRACKED_CHANNEL_TYPES,
  defaultSendPrefix: null,
  notifyUnread: false,
};

const DEFAULT_FOLDER: FilterFolder = {
  name: 'Filters',
  filters: ['General'],
};

interface Props {
  refetchEpoch: number;
  isLoggedIn: boolean;
  onFiltersReady: (filters: CustomFilter[], folders: FilterFolder[]) => void;
}

export function useSettingsSync({ refetchEpoch, isLoggedIn, onFiltersReady }: Props) {
  const isLoggedInRef = useRef(isLoggedIn);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onFiltersReadyRef = useRef(onFiltersReady);

  useEffect(() => {
    isLoggedInRef.current = isLoggedIn;
    onFiltersReadyRef.current = onFiltersReady;
  });

  // Load from server, re-fetching whenever refetchEpoch changes (character switch).
  // TQ handles request deduplication and lets the new query supersede stale responses.
  const { data: serverSettings, isSuccess: serverLoaded } = useQuery({
    queryKey: ['settings', refetchEpoch],
    queryFn: async () => {
      const r = await fetch(`${RELAY_ADDR}/settings`, { credentials: 'include' });
      if (r.status === 401) throw r;
      if (!r.ok) throw new Error('Failed to fetch settings');
      return (await r.json()) as Record<string, unknown>;
    },
    retry: false,
  });

  useEffect(() => {
    if (!serverSettings) return;
    const data = serverSettings;
    const patch: Partial<SettingsState> = {};
    if (typeof data.fontFamily === 'string') patch.fontFamily = data.fontFamily;
    if (typeof data.fontSize === 'number') patch.fontSize = data.fontSize;
    if (typeof data.italicizeSystem === 'boolean') patch.italicizeSystem = data.italicizeSystem;
    if (typeof data.useColoredBackground === 'boolean')
      patch.useColoredBackground = data.useColoredBackground;
    if (Array.isArray(data.disabledChannels))
      patch.disabledChannels = new Set<string>(data.disabledChannels as string[]);
    if (Array.isArray(data.trustedDomains))
      patch.trustedDomains = new Set<string>(data.trustedDomains as string[]);
    if (typeof data.tellModeAll === 'boolean') patch.tellModeAll = data.tellModeAll;
    if (typeof data.ctrlEnterToSend === 'boolean') patch.ctrlEnterToSend = data.ctrlEnterToSend;
    if (typeof data.emoteConfirm === 'boolean') patch.emoteConfirm = data.emoteConfirm;
    if (typeof data.emoteSortByName === 'boolean') patch.emoteSortByName = data.emoteSortByName;
    if (typeof data.retainSyncSendPrefix === 'boolean')
      patch.retainSyncSendPrefix = data.retainSyncSendPrefix;
    if (typeof data.largeLinkPreviews === 'boolean')
      patch.largeLinkPreviews = data.largeLinkPreviews;

    const loadedFilters: CustomFilter[] = Array.isArray(data.filters)
      ? (data.filters as CustomFilter[])
      : [];
    const loadedFolders: FilterFolder[] = Array.isArray(data.folders)
      ? (data.folders as FilterFolder[])
      : [];

    if (loadedFilters.length === 0 && loadedFolders.length === 0) {
      patch.filters = [DEFAULT_FILTER];
      patch.folders = [DEFAULT_FOLDER];
      useSettingsStore.getState().hydrate(patch);
      onFiltersReadyRef.current([DEFAULT_FILTER], [DEFAULT_FOLDER]);
    } else {
      patch.filters = loadedFilters;
      patch.folders = loadedFolders;
      useSettingsStore.getState().hydrate(patch);
      onFiltersReadyRef.current(loadedFilters, loadedFolders);
    }
  }, [serverSettings]);

  // Debounced PUT to server whenever any settings field changes (after initial load).
  useEffect(() => {
    if (!serverLoaded) return;
    const unsubscribe = useSettingsStore.subscribe((state, prev) => {
      // Skip if nothing relevant changed (action functions are stable references)
      if (state === prev) return;
      if (!isLoggedInRef.current) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (!isLoggedInRef.current) return;
        const s = useSettingsStore.getState();
        fetch(`${RELAY_ADDR}/settings`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fontFamily: s.fontFamily,
            fontSize: s.fontSize,
            italicizeSystem: s.italicizeSystem,
            useColoredBackground: s.useColoredBackground,
            disabledChannels: Array.from(s.disabledChannels),
            trustedDomains: Array.from(s.trustedDomains),
            filters: s.filters,
            folders: s.folders,
            tellModeAll: s.tellModeAll,
            ctrlEnterToSend: s.ctrlEnterToSend,
            emoteConfirm: s.emoteConfirm,
            emoteSortByName: s.emoteSortByName,
            retainSyncSendPrefix: s.retainSyncSendPrefix,
            largeLinkPreviews: s.largeLinkPreviews,
          }),
        }).catch(() => {});
      }, 500);
    });
    return () => {
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [serverLoaded]);
}
