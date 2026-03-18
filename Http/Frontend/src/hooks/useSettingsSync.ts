import { useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { RELAY_ADDR } from '../constants/config';
import { saveDisabledChannels, saveTrustedDomains } from '../lib/storageUtils';
import type { CustomFilter, FilterFolder } from '../types/filter';
import { TRACKED_CHANNEL_TYPES } from '../constants/channels';

interface Props {
  fontFamily: string;
  fontSize: number;
  italicizeSystem: boolean;
  useColoredBackground: boolean;
  disabledChannels: Set<string>;
  trustedDomains: Set<string>;
  filters: CustomFilter[];
  folders: FilterFolder[];
  setFontFamily: Dispatch<SetStateAction<string>>;
  setFontSize: Dispatch<SetStateAction<number>>;
  setItalicizeSystem: Dispatch<SetStateAction<boolean>>;
  setUseColoredBackground: Dispatch<SetStateAction<boolean>>;
  setDisabledChannels: Dispatch<SetStateAction<Set<string>>>;
  setTrustedDomains: Dispatch<SetStateAction<Set<string>>>;
  setFilters: Dispatch<SetStateAction<CustomFilter[]>>;
  setFolders: Dispatch<SetStateAction<FilterFolder[]>>;
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
  setFontFamily,
  setFontSize,
  setItalicizeSystem,
  setUseColoredBackground,
  setDisabledChannels,
  setTrustedDomains,
  setFilters,
  setFolders,
  onFiltersReady,
}: Props) {
  const serverLoadedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from server on mount; override localStorage with server values
  useEffect(() => {
    fetch(`${RELAY_ADDR}/settings`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: Record<string, unknown>) => {
        if (typeof data.fontFamily === 'string') setFontFamily(data.fontFamily);
        if (typeof data.fontSize === 'number') setFontSize(data.fontSize);
        if (typeof data.italicizeSystem === 'boolean') setItalicizeSystem(data.italicizeSystem);
        if (typeof data.useColoredBackground === 'boolean')
          setUseColoredBackground(data.useColoredBackground);
        if (Array.isArray(data.disabledChannels)) {
          const next = new Set<string>(data.disabledChannels as string[]);
          setDisabledChannels(next);
          saveDisabledChannels(next);
        }
        if (Array.isArray(data.trustedDomains)) {
          const next = new Set<string>(data.trustedDomains as string[]);
          setTrustedDomains(next);
          saveTrustedDomains(next);
        }

        // Restore filters / folders, or initialize with defaults if both are empty
        const loadedFilters: CustomFilter[] = Array.isArray(data.filters)
          ? (data.filters as CustomFilter[])
          : [];
        const loadedFolders: FilterFolder[] = Array.isArray(data.folders)
          ? (data.folders as FilterFolder[])
          : [];

        if (loadedFilters.length === 0 && loadedFolders.length === 0) {
          // Neither filters nor folders exist — generate defaults
          const defaultFilter: CustomFilter = {
            name: 'General',
            showChannelTypes: TRACKED_CHANNEL_TYPES,
            defaultSendPrefix: null,
            notifyUnread: false,
          };
          const defaultFolder: FilterFolder = {
            name: 'Filters',
            filters: ['General'],
          };
          setFilters([defaultFilter]);
          setFolders([defaultFolder]);
          onFiltersReady([defaultFilter], [defaultFolder]);
        } else {
          setFilters(loadedFilters);
          setFolders(loadedFolders);
          onFiltersReady(loadedFilters, loadedFolders);
        }
      })
      .catch(() => {
        // Server unreachable — fall back to defaults
        const defaultFilter: CustomFilter = {
          name: 'General',
          showChannelTypes: TRACKED_CHANNEL_TYPES,
          defaultSendPrefix: null,
          notifyUnread: false,
        };
        const defaultFolder: FilterFolder = {
          name: 'Filters',
          filters: ['General'],
        };
        setFilters([defaultFilter]);
        setFolders([defaultFolder]);
        onFiltersReady([defaultFilter], [defaultFolder]);
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
  ]);
}
