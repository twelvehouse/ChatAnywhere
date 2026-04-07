import { useEffect, useRef, useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { RELAY_ADDR } from '../constants/config';
import { dispatchUnauthorized } from '../lib/authEvent';
import type { ChatMessage } from '../types/chat';

const LIMIT = 200;

interface Result {
  loadOlder: () => void;
  hasMore: boolean;
  isLoadingOlder: boolean;
}

/**
 * Fetches the most recent LIMIT messages on mount, then exposes `loadOlder` to
 * fetch older pages on demand (e.g. when the user scrolls to the top).
 *
 * `hasMore` is determined client-side: if the server returned exactly LIMIT
 * messages, older messages may still exist.
 */
export function usePaginatedHistory(setMessages: Dispatch<SetStateAction<ChatMessage[]>>): Result {
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  // Refs keep stable references inside the loadOlder callback without re-creating it.
  const hasMoreRef = useRef(false);
  const isLoadingRef = useRef(false);
  const oldestTimestampRef = useRef<number | null>(null);

  // Initial load: fetch the newest LIMIT messages.
  useEffect(() => {
    fetch(`${RELAY_ADDR}/history?limit=${LIMIT}`, { credentials: 'include' })
      .then((r) => {
        if (r.status === 401) {
          dispatchUnauthorized();
          return Promise.reject();
        }
        return r.json();
      })
      .then((data: ChatMessage[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setMessages(data);
          oldestTimestampRef.current = data[0].Timestamp;
          const more = data.length === LIMIT;
          hasMoreRef.current = more;
          setHasMore(more);
        }
      })
      .catch(() => {});
  }, [setMessages]);

  // Load an older page of messages and prepend to the list.
  const loadOlder = useCallback(() => {
    if (isLoadingRef.current || !hasMoreRef.current) return;
    const before = oldestTimestampRef.current;
    if (before === null) return;

    isLoadingRef.current = true;
    setIsLoadingOlder(true);

    fetch(`${RELAY_ADDR}/history?limit=${LIMIT}&before=${before}`, { credentials: 'include' })
      .then((r) => {
        if (r.status === 401) {
          dispatchUnauthorized();
          return Promise.reject();
        }
        return r.json();
      })
      .then((data: ChatMessage[]) => {
        if (Array.isArray(data) && data.length > 0) {
          oldestTimestampRef.current = data[0].Timestamp;
          setMessages((prev) => [...data, ...prev]);
          const more = data.length === LIMIT;
          hasMoreRef.current = more;
          setHasMore(more);
        } else {
          hasMoreRef.current = false;
          setHasMore(false);
        }
      })
      .catch(() => {})
      .finally(() => {
        isLoadingRef.current = false;
        setIsLoadingOlder(false);
      });
  }, [setMessages]);

  return { loadOlder, hasMore, isLoadingOlder };
}
