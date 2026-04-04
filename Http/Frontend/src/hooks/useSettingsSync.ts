import { useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { RELAY_ADDR } from '../constants/config';
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
  onFiltersReady,
}: Props) {
  const serverLoadedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from server on mount
  useEffect(() => {
    fetch(`${RELAY_ADDR}/settings`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
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
      .catch(() => {
        setFilters([DEFAULT_FILTER]);
        setFolders([DEFAULT_FOLDER]);
        onFiltersReady([DEFAULT_FILTER], [DEFAULT_FOLDER]);
      })
      .finally(() => {
        serverLoadedRef.current = true;
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced PUT to server whenever settings change (after initial load)
  useEffect(() => {
    if (!serverLoadedRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      fetch(`${RELAY_ADDR}/settings`, {
        method: 'PUT',
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
  ]);
}
