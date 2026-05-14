import { useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { RELAY_ADDR } from '../constants/config';
import { dispatchUnauthorized } from '../lib/authEvent';
import type { CustomFilter, FilterFolder } from '../types/filter';
import { TRACKED_CHANNEL_TYPES } from '../constants/channels';

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
  refetchEpoch: number;
  isLoggedIn: boolean;
  setFontFamily: Dispatch<SetStateAction<string>>;
  setFontSize: Dispatch<SetStateAction<number>>;
  setItalicizeSystem: Dispatch<SetStateAction<boolean>>;
  setUseColoredBackground: Dispatch<SetStateAction<boolean>>;
  setDisabledChannels: Dispatch<SetStateAction<Set<string>>>;
  setTrustedDomains: Dispatch<SetStateAction<Set<string>>>;
  setFilters: Dispatch<SetStateAction<CustomFilter[]>>;
  setFolders: Dispatch<SetStateAction<FilterFolder[]>>;
  setTellModeAll: Dispatch<SetStateAction<boolean>>;
  setCtrlEnterToSend: Dispatch<SetStateAction<boolean>>;
  setEmoteConfirm: Dispatch<SetStateAction<boolean>>;
  setEmoteSortByName: Dispatch<SetStateAction<boolean>>;
  setRetainSyncSendPrefix: Dispatch<SetStateAction<boolean>>;
  setLargeLinkPreviews: Dispatch<SetStateAction<boolean>>;
  onFiltersReady: (filters: CustomFilter[], folders: FilterFolder[]) => void;
}

export function useSettingsSync({
  fontFamily,
  fontSize,
  italicizeSystem,
  useColoredBackground,
  disabledChannels,
  trustedDomains,
  filters,
  folders,
  tellModeAll,
  ctrlEnterToSend,
  emoteConfirm,
  emoteSortByName,
  retainSyncSendPrefix,
  largeLinkPreviews,
  refetchEpoch,
  isLoggedIn,
  setFontFamily,
  setFontSize,
  setItalicizeSystem,
  setUseColoredBackground,
  setDisabledChannels,
  setTrustedDomains,
  setFilters,
  setFolders,
  setTellModeAll,
  setCtrlEnterToSend,
  setEmoteConfirm,
  setEmoteSortByName,
  setRetainSyncSendPrefix,
  setLargeLinkPreviews,
  onFiltersReady,
}: Props) {
  const serverLoadedRef = useRef(false);
  const isLoggedInRef = useRef(isLoggedIn);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isLoggedInRef.current = isLoggedIn;
  });

  // Load from server on mount and whenever refetchEpoch increments (character change).
  // AbortController cancels the previous in-flight request so a stale response
  // from a prior character cannot overwrite the settings of the new one.
  useEffect(() => {
    const controller = new AbortController();
    serverLoadedRef.current = false;
    fetch(`${RELAY_ADDR}/settings`, { credentials: 'include', signal: controller.signal })
      .then((r) => {
        if (r.status === 401) {
          dispatchUnauthorized();
          return Promise.reject();
        }
        return r.ok ? r.json() : Promise.reject();
      })
      .then((data: Record<string, unknown>) => {
        if (typeof data.fontFamily === 'string') setFontFamily(data.fontFamily);
        if (typeof data.fontSize === 'number') setFontSize(data.fontSize);
        if (typeof data.italicizeSystem === 'boolean') setItalicizeSystem(data.italicizeSystem);
        if (typeof data.useColoredBackground === 'boolean')
          setUseColoredBackground(data.useColoredBackground);
        if (Array.isArray(data.disabledChannels))
          setDisabledChannels(new Set<string>(data.disabledChannels as string[]));
        if (Array.isArray(data.trustedDomains))
          setTrustedDomains(new Set<string>(data.trustedDomains as string[]));
        if (typeof data.tellModeAll === 'boolean') setTellModeAll(data.tellModeAll);
        if (typeof data.ctrlEnterToSend === 'boolean') setCtrlEnterToSend(data.ctrlEnterToSend);
        if (typeof data.emoteConfirm === 'boolean') setEmoteConfirm(data.emoteConfirm);
        if (typeof data.emoteSortByName === 'boolean') setEmoteSortByName(data.emoteSortByName);
        if (typeof data.retainSyncSendPrefix === 'boolean')
          setRetainSyncSendPrefix(data.retainSyncSendPrefix);
        if (typeof data.largeLinkPreviews === 'boolean')
          setLargeLinkPreviews(data.largeLinkPreviews);

        // Restore filters / folders, or initialize with defaults if both are empty
        const loadedFilters: CustomFilter[] = Array.isArray(data.filters)
          ? (data.filters as CustomFilter[])
          : [];
        const loadedFolders: FilterFolder[] = Array.isArray(data.folders)
          ? (data.folders as FilterFolder[])
          : [];

        if (loadedFilters.length === 0 && loadedFolders.length === 0) {
          setFilters([DEFAULT_FILTER]);
          setFolders([DEFAULT_FOLDER]);
          onFiltersReady([DEFAULT_FILTER], [DEFAULT_FOLDER]);
        } else {
          setFilters(loadedFilters);
          setFolders(loadedFolders);
          onFiltersReady(loadedFilters, loadedFolders);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setFilters([DEFAULT_FILTER]);
        setFolders([DEFAULT_FOLDER]);
        onFiltersReady([DEFAULT_FILTER], [DEFAULT_FOLDER]);
      })
      .finally(() => {
        if (!controller.signal.aborted) serverLoadedRef.current = true;
      });

    return () => controller.abort();
  }, [refetchEpoch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced PUT to server whenever settings change (after initial load)
  useEffect(() => {
    if (!serverLoadedRef.current || !isLoggedInRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      // Re-check here because the timer may fire after a logout that happened
      // before the 500ms debounce elapsed (the effect cleanup doesn't cancel it).
      if (!isLoggedInRef.current) return;
      fetch(`${RELAY_ADDR}/settings`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fontFamily,
          fontSize,
          italicizeSystem,
          useColoredBackground,
          disabledChannels: Array.from(disabledChannels),
          trustedDomains: Array.from(trustedDomains),
          filters,
          folders,
          tellModeAll,
          ctrlEnterToSend,
          emoteConfirm,
          emoteSortByName,
          retainSyncSendPrefix,
          largeLinkPreviews,
        }),
      }).catch(() => {});
    }, 500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [
    fontFamily,
    fontSize,
    italicizeSystem,
    useColoredBackground,
    disabledChannels,
    trustedDomains,
    filters,
    folders,
    tellModeAll,
    ctrlEnterToSend,
    emoteConfirm,
    emoteSortByName,
    retainSyncSendPrefix,
    largeLinkPreviews,
  ]);
}
