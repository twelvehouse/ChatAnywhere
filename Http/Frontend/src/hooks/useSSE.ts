import { useEffect } from 'react';
import type { Dispatch, SetStateAction, RefObject } from 'react';
import { RELAY_ADDR } from '../constants/config';
import type { ChatMessage, ChannelOption } from '../types/chat';
import type { SseEvent } from '../types/sse';
import type { CustomFilter } from '../types/filter';

interface UseSSEOptions {
  setIsConnected: Dispatch<SetStateAction<boolean>>;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setServerChannels: Dispatch<SetStateAction<ChannelOption[]>>;
  setSelectedSendPrefix: Dispatch<SetStateAction<string>>;
  setUnreadMap: Dispatch<SetStateAction<Record<string, number>>>;
  setHasUnreadDown: Dispatch<SetStateAction<boolean>>;
  setLocalPlayerName: Dispatch<SetStateAction<string>>;
  setLocalPlayerWorld: Dispatch<SetStateAction<string>>;
  isNearBottomRef: RefObject<boolean>;
  activeFilterNameRef: RefObject<string>;
  filtersRef: RefObject<CustomFilter[]>;
  lastGameChannelRef: RefObject<string>;
}

export function useSSE({
  setIsConnected,
  setMessages,
  setServerChannels,
  setSelectedSendPrefix,
  setUnreadMap,
  setHasUnreadDown,
  setLocalPlayerName,
  setLocalPlayerWorld,
  isNearBottomRef,
  activeFilterNameRef,
  filtersRef,
  lastGameChannelRef,
}: UseSSEOptions): void {
  // SSE connection with exponential-backoff reconnect
  useEffect(() => {
    let sse: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let retryCount = 0;

    const updateChannels = (incoming: ChannelOption[]) => {
      setServerChannels(incoming);
      setSelectedSendPrefix((prev) => {
        const found = incoming.find((c) => c.prefix === prev);
        return found ? prev : (incoming[0]?.prefix ?? prev);
      });
    };

    const connectSSE = () => {
      sse = new EventSource(`${RELAY_ADDR}/sse`, { withCredentials: true });

      sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as SseEvent;

          if (data.type === 'connected') {
            setIsConnected(true);
            retryCount = 0;
            return;
          }
          if (data.type === 'ping') return;

          if (data.type === 'reset') {
            setMessages([]);
            setUnreadMap({});
            setHasUnreadDown(false);
            setLocalPlayerName('');
            setLocalPlayerWorld('');
            return;
          }

          if (data.type === 'player-info') {
            setLocalPlayerName(data.name as string);
            setLocalPlayerWorld(data.world as string);
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
        setIsConnected(false);
        if (sse) sse.close();
        retryCount++;
        reconnectTimeout = setTimeout(connectSSE, Math.min(1000 * 2 ** retryCount, 30000));
      };
    };

    connectSSE();
    return () => {
      if (sse) sse.close();
      clearTimeout(reconnectTimeout);
    };
  }, [
    setIsConnected,
    setMessages,
    setServerChannels,
    setSelectedSendPrefix,
    setUnreadMap,
    setHasUnreadDown,
    setLocalPlayerName,
    setLocalPlayerWorld,
    activeFilterNameRef,
    filtersRef,
    lastGameChannelRef,
    isNearBottomRef,
  ]);
}
