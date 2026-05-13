import { useState, useCallback } from 'react';
import { RELAY_ADDR } from '../constants/config';
import { dispatchUnauthorized } from '../lib/authEvent';

export interface FilterMode {
  characterKey: string | null;
  isPersonal: boolean;
  hasExistingFile: boolean;
  personalFilterCharacters: string[];
}

interface UseFilterModeResult {
  filterMode: FilterMode | null;
  isLoading: boolean;
  fetchFilterMode: () => Promise<void>;
  enablePersonalFilters: (copyFromGlobal: boolean) => Promise<void>;
  disablePersonalFilters: () => Promise<void>;
  deletePersonalFilters: (key: string) => Promise<void>;
}

const DEFAULT_MODE: FilterMode = {
  characterKey: null,
  isPersonal: false,
  hasExistingFile: false,
  personalFilterCharacters: [],
};

export function useFilterMode(): UseFilterModeResult {
  const [filterMode, setFilterMode] = useState<FilterMode | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchFilterMode = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${RELAY_ADDR}/settings/filter-mode`, { credentials: 'include' });
      if (res.status === 401) {
        dispatchUnauthorized();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setFilterMode(data as FilterMode);
      }
    } catch {
      setFilterMode(DEFAULT_MODE);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const enablePersonalFilters = useCallback(
    async (copyFromGlobal: boolean) => {
      const res = await fetch(`${RELAY_ADDR}/settings/filter-mode`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ copyFromGlobal }),
      });
      if (res.status === 401) {
        dispatchUnauthorized();
        return;
      }
      await fetchFilterMode();
    },
    [fetchFilterMode],
  );

  const disablePersonalFilters = useCallback(async () => {
    const res = await fetch(`${RELAY_ADDR}/settings/filter-mode`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.status === 401) {
      dispatchUnauthorized();
      return;
    }
    await fetchFilterMode();
  }, [fetchFilterMode]);

  const deletePersonalFilters = useCallback(
    async (key: string) => {
      const res = await fetch(`${RELAY_ADDR}/settings/characters?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.status === 401) {
        dispatchUnauthorized();
        return;
      }
      await fetchFilterMode();
    },
    [fetchFilterMode],
  );

  return {
    filterMode,
    isLoading,
    fetchFilterMode,
    enablePersonalFilters,
    disablePersonalFilters,
    deletePersonalFilters,
  };
}
