import { useRef, useState, useLayoutEffect } from 'react';
import type { UIEvent, Dispatch, SetStateAction } from 'react';

interface Options {
  activeFilterName: string;
  filteredMessagesLength: number;
}

interface Result {
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  messagesInnerRef: React.RefObject<HTMLDivElement | null>;
  scrollToBottomRef: React.MutableRefObject<(() => void) | null>;
  isNearBottomRef: React.RefObject<boolean>;
  handleScroll: (e: UIEvent<HTMLDivElement>) => void;
  hasUnreadDown: boolean;
  setHasUnreadDown: Dispatch<SetStateAction<boolean>>;
}

export function useScrollBehavior({ activeFilterName, filteredMessagesLength }: Options): Result {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesInnerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const scrollToBottomRef = useRef<(() => void) | null>(null);

  const [hasUnreadDown, setHasUnreadDown] = useState(false);

  const prevFilterName = useRef(activeFilterName);
  const prevMsgsLength = useRef(filteredMessagesLength);

  const scrollToBottom = () => {
    scrollToBottomRef.current?.();
    isNearBottomRef.current = true;
  };

  useLayoutEffect(() => {
    if (activeFilterName !== prevFilterName.current) {
      prevFilterName.current = activeFilterName;
      prevMsgsLength.current = filteredMessagesLength;
      scrollToBottom();
    } else if (filteredMessagesLength > prevMsgsLength.current) {
      prevMsgsLength.current = filteredMessagesLength;
      if (isNearBottomRef.current) {
        scrollToBottom();
      }
    }
  }, [activeFilterName, filteredMessagesLength]);

  useLayoutEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      if (isNearBottomRef.current) {
        scrollToBottom();
      }
    });

    const innerEl = messagesInnerRef.current;
    if (innerEl) observer.observe(innerEl);

    const handleImageLoad = () => {
      if (isNearBottomRef.current) {
        scrollToBottom();
      }
    };
    el.addEventListener('load', handleImageLoad, true);

    return () => {
      observer.disconnect();
      el.removeEventListener('load', handleImageLoad, true);
    };
  }, []);

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const nearBot = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    isNearBottomRef.current = nearBot;
    if (nearBot) {
      setHasUnreadDown(false);
    }
  };

  return {
    messagesContainerRef,
    messagesInnerRef,
    scrollToBottomRef,
    isNearBottomRef,
    handleScroll,
    hasUnreadDown,
    setHasUnreadDown,
  };
}
