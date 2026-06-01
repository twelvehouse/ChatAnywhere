import { useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction, RefObject } from 'react';
import { RELAY_ADDR } from '../constants/config';
import { useSessionStore } from '../store/sessionStore';
import type { ChatMessage, ChannelOption } from '../types/chat';
import type { SseEvent } from '../types/sse';
import type { CustomFilter } from '../types/filter';

interface UseSSEOptions {
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setServerChannels: Dispatch<SetStateAction<ChannelOption[]>>;
  setSelectedSendPrefix: Dispatch<SetStateAction<string>>;
  setUnreadMap: Dispatch<SetStateAction<Record<string, number>>>;
  setHasUnreadDown: Dispatch<SetStateAction<boolean>>;
  onReset: () => void;
  isNearBottomRef: RefObject<boolean>;
  activeFilterNameRef: RefObject<string>;
  filtersRef: RefObject<CustomFilter[]>;
  lastGameChannelRef: RefObject<string>;
}

interface UseSSEResult {
  reconnect: () => void;
}

export function useSSE({
  setMessages,
  setServerChannels,
  setSelectedSendPrefix,
  setUnreadMap,
  setHasUnreadDown,
  onReset,
  isNearBottomRef,
  activeFilterNameRef,
  filtersRef,
  lastGameChannelRef,
}: UseSSEOptions): UseSSEResult {
  const setConnected = useSessionStore((s) => s.setConnected);
  const setPlayer = useSessionStore((s) => s.setPlayer);

  // Hoisted so reconnect() (called from outside the effect) can reach them.
  const sseRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const forceReconnectRef = useRef<() => void>(() => {});

  useEffect(() => {
    const updateChannels = (incoming: ChannelOption[]) => {
      setServerChannels(incoming);
      setSelectedSendPrefix((prev) => {
        const found = incoming.find((c) => c.prefix === prev);
        return found ? prev : (incoming[0]?.prefix ?? prev);
      });
    };

    const connectSSE = () => {
      const sse = new EventSource(`${RELAY_ADDR}/sse`, { withCredentials: true });
      sseRef.current = sse;

      sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as SseEvent;

          if (data.type === 'connected') {
            setConnected(true);
            retryCountRef.current = 0;
            return;
          }
          if (data.type === 'ping') return;

          if (data.type === 'reset') {
            setMessages([]);
            setUnreadMap({});
            setHasUnreadDown(false);
            setPlayer('', '');
            onReset();
            return;
          }

          if (data.type === 'player-info') {
            setPlayer(data.name as string, data.world as string);
            return;
          }

          if (data.type === 'channels') {
            updateChannels(data.channels as ChannelOption[]);
            return;
          }

          if (data.type === 'active-channel') {
            // Always track the latest game channel, regardless of the active filter
            if (data.prefix) lastGameChannelRef.current = data.prefix;
            // Only sync with game when the active filter has no fixed send prefix
            const activeFilter = filtersRef.current?.find(
              (f) => f.name === activeFilterNameRef.current,
            );
            if (activeFilter?.defaultSendPrefix == null) {
              if (data.prefix) setSelectedSendPrefix(data.prefix);
            }
            return;
          }

          // Real-time chat message
          setMessages((prev) => [...prev, data as ChatMessage]);

          setUnreadMap((prevUnread) => {
            let changed = false;
            const newUnread = { ...prevUnread };
            filtersRef.current?.forEach((filter) => {
              const matches = filter.showChannelTypes.includes(data.Type);
              if (matches) {
                if (filter.name !== activeFilterNameRef.current) {
                  if (filter.notifyUnread) {
                    newUnread[filter.name] = (newUnread[filter.name] || 0) + 1;
                    changed = true;
                  }
                } else {
                  if (!isNearBottomRef.current) {
                    setHasUnreadDown(true);
                  }
                }
              }
            });
            return changed ? newUnread : prevUnread;
          });
        } catch (e) {
          console.error('SSE Parsing Error:', e);
        }
      };

      sse.onerror = () => {
        setConnected(false);
        if (sseRef.current) sseRef.current.close();
        retryCountRef.current++;
        reconnectTimeoutRef.current = setTimeout(
          connectSSE,
          Math.min(1000 * 2 ** retryCountRef.current, 30000),
        );
      };
    };

    forceReconnectRef.current = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (sseRef.current) sseRef.current.close();
      retryCountRef.current = 0;
      setConnected(false);
      connectSSE();
    };

    connectSSE();
    return () => {
      if (sseRef.current) sseRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [
    setConnected,
    setPlayer,
    setMessages,
    setServerChannels,
    setSelectedSendPrefix,
    setUnreadMap,
    setHasUnreadDown,
    onReset,
    activeFilterNameRef,
    filtersRef,
    lastGameChannelRef,
    isNearBottomRef,
  ]);

  return { reconnect: () => forceReconnectRef.current() };
}
