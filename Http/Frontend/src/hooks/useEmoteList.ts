import { useQuery } from '@tanstack/react-query';
import { RELAY_ADDR } from '../constants/config';

export interface Emote {
  id: number;
  name: string;
  command: string;
  iconId: number;
  isOwned: boolean;
}

interface State {
  emotes: Emote[];
  loading: boolean;
  error: string | null;
}

export function useEmoteList(): State {
  const { data, isLoading, error } = useQuery({
    queryKey: ['emotes'],
    queryFn: async () => {
      const r = await fetch(`${RELAY_ADDR}/emotes`, { credentials: 'include' });
      if (r.status === 401) throw r;
      if (!r.ok) throw new Error('Failed to fetch emotes');
      const json = (await r.json()) as { emotes: Emote[] };
      return json.emotes ?? [];
    },
    staleTime: Infinity,
  });

  return {
    emotes: data ?? [],
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
  };
}
