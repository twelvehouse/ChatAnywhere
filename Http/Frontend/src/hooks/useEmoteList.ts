import { useState, useEffect } from 'react';
import { RELAY_ADDR } from '../constants/config';
import { dispatchUnauthorized } from '../lib/authEvent';

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
  const [state, setState] = useState<State>({ emotes: [], loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    fetch(`${RELAY_ADDR}/emotes`, { credentials: 'include' })
      .then((r) => {
        if (r.status === 401) {
          dispatchUnauthorized();
          return Promise.reject();
        }
        return r.json();
      })
      .then((data: { emotes: Emote[] }) => {
        if (!cancelled) setState({ emotes: data.emotes ?? [], loading: false, error: null });
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ emotes: [], loading: false, error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
