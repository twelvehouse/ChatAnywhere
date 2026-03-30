import type { UIEvent } from 'react';
import { useEffect, useRef, useLayoutEffect, useCallback, useMemo } from 'react';
import styles from './MessageList.module.css';
import { ErrorBoundary } from '../ErrorBoundary';
import { MessageItem } from './MessageItem';
import { TELL_INCOMING, TELL_OUTGOING } from '../../constants/channels';
import type { ChatMessage } from '../../types/chat';

const TELL_SCAN_LIMIT = 200;

/**
 * Returns true when name+world identify the same player.
 * If either world is absent (same-world tells omit the world in the payload), falls back to name-only comparison.
 */
function samePlayer(
  name: string,
  world: string | undefined,
  otherName: string,
  otherWorld: string | undefined,
): boolean {
  if (name !== otherName) return false;
  if (world && otherWorld) return world === otherWorld;
  return true; // world omitted in same-world payloads — name match is sufficient
}

/**
 * Search backwards through the message list to find the most recent Tell that
 * belongs to the same conversation as `messages[idx]`.
 *
 * Both name and world are compared to correctly handle same-name players on
 * different worlds. If world data is absent (legacy history), name-only matching
 * is used as a fallback.
 *
 * For TellIncoming from X@WorldX:
 *   – accepts TellOutgoing to X@WorldX
 *   – accepts TellIncoming from X@WorldX
 *   – skips Tells from/to other parties (interleaved conversations)
 *
 * For TellOutgoing to Y@WorldY:
 *   – accepts TellIncoming from Y@WorldY
 *   – accepts TellOutgoing to Y@WorldY
 *   – skips Tells from/to other parties
 */
function findTellRef(messages: ChatMessage[], idx: number): ChatMessage | null {
  const msg = messages[idx];
  if (msg.Type !== TELL_INCOMING && msg.Type !== TELL_OUTGOING) return null;

  const floor = Math.max(0, idx - TELL_SCAN_LIMIT);

  if (msg.Type === TELL_INCOMING) {
    for (let i = idx - 1; i >= floor; i--) {
      const prev = messages[i];
      if (
        prev.Type === TELL_OUTGOING &&
        samePlayer(prev.RecipientName ?? '', prev.RecipientWorld, msg.SenderName, msg.SenderWorld)
      )
        return prev;
      if (
        prev.Type === TELL_INCOMING &&
        samePlayer(prev.SenderName, prev.SenderWorld, msg.SenderName, msg.SenderWorld)
      )
        return prev;
      // Other tells (different conversation partner) — skip, don't stop
    }
  } else {
    // TellOutgoing — partner identified by RecipientName/RecipientWorld
    for (let i = idx - 1; i >= floor; i--) {
      const prev = messages[i];
      if (
        prev.Type === TELL_INCOMING &&
        samePlayer(prev.SenderName, prev.SenderWorld, msg.RecipientName ?? '', msg.RecipientWorld)
      )
        return prev;
      if (
        prev.Type === TELL_OUTGOING &&
        samePlayer(
          prev.RecipientName ?? '',
          prev.RecipientWorld,
          msg.RecipientName ?? '',
          msg.RecipientWorld,
        )
      )
        return prev;
    }
  }

  return null;
}

interface Props {
  messages: ChatMessage[];
  isConnected: boolean;
  bannerCount: number;
  hasUnreadDown: boolean;
  loadOlder: () => void;
  hasMore: boolean;
  isLoadingOlder: boolean;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  messagesInnerRef: React.RefObject<HTMLDivElement | null>;
  scrollToBottomRef: React.MutableRefObject<(() => void) | null>;
  onScroll: (e: UIEvent<HTMLDivElement>) => void;
  onDismissBanner: () => void;
  onScrollToBottom: () => void;
  onLinkClick: (url: string) => void;
  italicizeSystem: boolean;
  useColoredBackground: boolean;
  tellModeAll: boolean;
  onReply: (name: string, world?: string) => void;
  trustedDomains: Set<string>;
}

export function MessageList({
  messages,
  isConnected,
  bannerCount,
  hasUnreadDown,
  loadOlder,
  hasMore,
  isLoadingOlder,
  messagesContainerRef,
  messagesInnerRef,
  scrollToBottomRef,
  onScroll,
  onDismissBanner,
  onScrollToBottom,
  onLinkClick,
  italicizeSystem,
  useColoredBackground,
  tellModeAll,
  onReply,
  trustedDomains,
}: Props) {
  const tellRefs = useMemo(() => messages.map((_, idx) => findTellRef(messages, idx)), [messages]);

  const topSentinelRef = useRef<HTMLDivElement>(null);
  // Captures scrollHeight immediately before triggering a load, used to restore position after prepend.
  const prevScrollHeightRef = useRef(0);
  // Tracks the previous isLoadingOlder value to detect the transition true→false (load completed).
  const wasLoadingOlderRef = useRef(false);

  // Expose plain scroll-to-bottom (no virtualizer).
  useEffect(() => {
    scrollToBottomRef.current = () => {
      const container = messagesContainerRef.current;
      if (container) container.scrollTop = container.scrollHeight;
    };
    return () => {
      scrollToBottomRef.current = null;
    };
  }, [scrollToBottomRef, messagesContainerRef]);

  // Restore scroll position after a prepend completes so the viewport doesn't jump.
  // Only applied when the user is not near the bottom (isNearBottom check is handled
  // upstream by useScrollBehavior, which will call scrollToBottom when near bottom anyway).
  useLayoutEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    if (wasLoadingOlderRef.current && !isLoadingOlder) {
      container.scrollTop += container.scrollHeight - prevScrollHeightRef.current;
    }
    wasLoadingOlderRef.current = isLoadingOlder;
  }, [isLoadingOlder, messagesContainerRef]);

  // Wrap loadOlder to capture the current scrollHeight before the state update.
  const handleLoadOlder = useCallback(() => {
    const container = messagesContainerRef.current;
    prevScrollHeightRef.current = container?.scrollHeight ?? 0;
    loadOlder();
  }, [loadOlder, messagesContainerRef]);

  // IntersectionObserver on the top sentinel: triggers a page load when the user
  // scrolls far enough toward the top of the message list.
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    const container = messagesContainerRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadOlder();
        }
      },
      { root: container, threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, handleLoadOlder, messagesContainerRef]);

  // Sparse-page auto-fill: when the rendered content is shorter than the viewport
  // (e.g. active filter matches very few message types), keep loading until the
  // viewport is filled or there are no more pages. No loop cap is needed — the
  // server's total retention (TrackedTypes × MaxPerType) guarantees termination.
  useEffect(() => {
    if (!hasMore || isLoadingOlder) return;
    const container = messagesContainerRef.current;
    if (!container) return;
    if (container.scrollHeight <= container.clientHeight) {
      handleLoadOlder();
    }
  }, [messages.length, hasMore, isLoadingOlder, handleLoadOlder, messagesContainerRef]);

  return (
    <div className={styles['messages-wrapper']}>
      {bannerCount > 0 && (
        <div className={styles['unread-banner']} onClick={onDismissBanner}>
          <span>
            {bannerCount} new message{bannerCount !== 1 ? 's' : ''}
          </span>
          <span className={styles.dismiss}>
            Mark as read <span style={{ fontSize: '1rem' }}>✔</span>
          </span>
        </div>
      )}

      <ErrorBoundary>
        <div className={styles.messages} ref={messagesContainerRef} onScroll={onScroll}>
          <div ref={messagesInnerRef} className={styles['messages-inner']}>
            {hasMore && <div ref={topSentinelRef} className={styles['load-more-sentinel']} />}
            {isLoadingOlder && (
              <div className={styles['loading-older']}>Loading older messages…</div>
            )}

            {messages.length === 0 && (
              <div className={styles['messages-empty']}>
                <div className={styles['messages-empty-icon']}>💬</div>
                <div>
                  {isConnected ? 'No messages in this filter.' : 'Waiting for chat stream...'}
                </div>
              </div>
            )}

            {messages.map((msg, index) => (
              <MessageItem
                key={`${msg.Timestamp}-${msg.Type}-${msg.SenderName}-${index}`}
                msg={msg}
                prevMsg={index > 0 ? messages[index - 1] : null}
                nextMsg={index < messages.length - 1 ? messages[index + 1] : null}
                tellRef={tellRefs[index]}
                onLinkClick={onLinkClick}
                italicizeSystem={italicizeSystem}
                useColoredBackground={useColoredBackground}
                tellModeAll={tellModeAll}
                onReply={onReply}
                trustedDomains={trustedDomains}
              />
            ))}
          </div>
        </div>
      </ErrorBoundary>

      {hasUnreadDown && (
        <div className={styles['unread-down-pill']} onClick={onScrollToBottom}>
          New messages ↓
        </div>
      )}
    </div>
  );
}
