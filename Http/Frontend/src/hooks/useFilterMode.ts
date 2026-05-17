import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RELAY_ADDR } from '../constants/config';

export interface FilterMode {
  characterKey: string | null;
  isPersonal: boolean;
  hasExistingFile: boolean;
  personalFilterCharacters: string[];
}

interface UseFilterModeOptions {
  enabled?: boolean;
}

interface UseFilterModeResult {
  filterMode: FilterMode | null;
  isLoading: boolean;
  refetchFilterMode: () => Promise<unknown>;
  enablePersonalFilters: (copyFromGlobal: boolean) => Promise<void>;
  disablePersonalFilters: () => Promise<void>;
  deletePersonalFilters: (key: string) => Promise<void>;
}

const FILTER_MODE_KEY = ['filterMode'] as const;

export function useFilterMode({ enabled = true }: UseFilterModeOptions = {}): UseFilterModeResult {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: FILTER_MODE_KEY,
    queryFn: async () => {
      const res = await fetch(`${RELAY_ADDR}/settings/filter-mode`, { credentials: 'include' });
      if (res.status === 401) throw res;
      if (!res.ok) throw new Error('Failed to fetch filter mode');
      return (await res.json()) as FilterMode;
    },
    enabled,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: FILTER_MODE_KEY });

  const enableMutation = useMutation({
    mutationFn: async (copyFromGlobal: boolean) => {
      const res = await fetch(`${RELAY_ADDR}/settings/filter-mode`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ copyFromGlobal }),
      });
      if (res.status === 401) throw res;
      if (!res.ok) throw new Error('Failed to enable personal filters');
    },
    onSuccess: invalidate,
  });

  const disableMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${RELAY_ADDR}/settings/filter-mode`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.status === 401) throw res;
      if (!res.ok) throw new Error('Failed to disable personal filters');
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async (key: string) => {
      const res = await fetch(`${RELAY_ADDR}/settings/characters?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.status === 401) throw res;
      if (!res.ok) throw new Error('Failed to delete personal filters');
    },
    onSuccess: invalidate,
  });

  return {
    filterMode: data ?? null,
    isLoading,
    refetchFilterMode: refetch,
    enablePersonalFilters: (copyFromGlobal) => enableMutation.mutateAsync(copyFromGlobal).then(),
    disablePersonalFilters: () => disableMutation.mutateAsync().then(),
    deletePersonalFilters: (key) => deleteMutation.mutateAsync(key).then(),
  };
}
