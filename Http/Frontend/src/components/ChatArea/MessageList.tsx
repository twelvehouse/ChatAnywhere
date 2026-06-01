import type { UIEvent } from 'react';
import { useEffect, useRef, useLayoutEffect } from 'react';
import { MessageSquare, AlertCircle, RefreshCw } from 'lucide-react';
import { useSessionStore } from '../../store/sessionStore';
import styles from './MessageList.module.css';
import { ErrorBoundary } from '../ErrorBoundary';
import { MessageItem } from './MessageItem';
import { TELL_INCOMING, TELL_OUTGOING } from '../../constants/channels';
import type { ChatMessage } from '../../types/chat';

const TELL_SCAN_LIMIT = 200;

const PULL_THRESHOLD = 80;
const PULL_MAX = 140;
const PULL_HYSTERESIS = 74; // ~92% of threshold — kills edge-flicker on finger jitter
const PULL_RESISTANCE = 0.42;

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
  filterName?: string;
  bannerCount: number;
  hasUnreadDown: boolean;
  loadOlder: () => void;
  onReconnect: () => void;
  hasMore: boolean;
  isLoadingOlder: boolean;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  messagesInnerRef: React.RefObject<HTMLDivElement | null>;
  scrollToBottomRef: React.MutableRefObject<(() => void) | null>;
  onScroll: (e: UIEvent<HTMLDivElement>) => void;
  onDismissBanner: () => void;
  onScrollToBottom: () => void;
  onLinkClick: (url: string) => void;
  onReply: (name: string, world?: string) => void;
  disableTellRef?: boolean;
}

export function MessageList({
  messages,
  filterName,
  bannerCount,
  hasUnreadDown,
  loadOlder,
  onReconnect,
  hasMore,
  isLoadingOlder,
  messagesContainerRef,
  messagesInnerRef,
  scrollToBottomRef,
  onScroll,
  onDismissBanner,
  onScrollToBottom,
  onLinkClick,
  onReply,
  disableTellRef = false,
}: Props) {
  const isConnected = useSessionStore((s) => s.isConnected);

  const tellRefs = disableTellRef
    ? messages.map(() => null)
    : messages.map((_, idx) => findTellRef(messages, idx));

  const topSentinelRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Captures scrollHeight before a prepend so position can be restored afterward.
  const prevScrollHeightRef = useRef(0);
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
  const handleLoadOlder = () => {
    const container = messagesContainerRef.current;
    prevScrollHeightRef.current = container?.scrollHeight ?? 0;
    loadOlder();
  };

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

  // Pull-to-reconnect — touch only (no wheel/PC support by design).
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const container = messagesContainerRef.current;
    const inner = messagesInnerRef.current;
    if (!wrapper || !container || !inner) return;

    let engaged = false;
    let startY = 0;
    let currentPull = 0;
    let ready = false;

    const isAtBottom = () =>
      container.scrollHeight - container.scrollTop - container.clientHeight < 2;

    const applyPull = (px: number) => {
      currentPull = px;
      wrapper.style.setProperty('--pull-y', px + 'px');
      const nextReady = ready ? px >= PULL_HYSTERESIS : px >= PULL_THRESHOLD;
      if (nextReady !== ready) {
        ready = nextReady;
        wrapper.dataset.ready = ready ? '1' : '0';
      }
    };

    let releaseTimer: ReturnType<typeof setTimeout> | null = null;
    const reset = () => {
      currentPull = 0;
      ready = false;
      inner.classList.add(styles['is-releasing']);
      wrapper.style.setProperty('--pull-y', '0px');
      wrapper.dataset.ready = '0';
      if (releaseTimer) clearTimeout(releaseTimer);
      releaseTimer = setTimeout(() => {
        inner.classList.remove(styles['is-releasing']);
        releaseTimer = null;
      }, 360);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      if (!isAtBottom()) return;
      engaged = true;
      startY = e.touches[0].clientY;
      currentPull = 0;
      inner.classList.remove(styles['is-releasing']);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!engaged) return;
      const dy = startY - e.touches[0].clientY;

      if (dy <= 0) {
        if (currentPull > 0) applyPull(0);
        return;
      }
      if (!isAtBottom()) {
        engaged = false;
        if (currentPull > 0) applyPull(0);
        return;
      }

      const eased =
        dy < PULL_THRESHOLD ? dy : PULL_THRESHOLD + (dy - PULL_THRESHOLD) * PULL_RESISTANCE;
      applyPull(Math.min(eased, PULL_MAX));
      // preventDefault suppresses iOS rubber-band so our translate is the only motion.
      if (e.cancelable) e.preventDefault();
    };

    const onTouchEnd = () => {
      if (!engaged) return;
      const shouldFire = currentPull >= PULL_THRESHOLD;
      engaged = false;
      reset();
      if (shouldFire) onReconnect();
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd);
    container.addEventListener('touchcancel', onTouchEnd);

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [messagesContainerRef, messagesInnerRef, onReconnect]);

  return (
    <div className={styles['messages-wrapper']} ref={wrapperRef} data-ready="0">
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

      <div className={styles['pull-reveal']} aria-hidden="true">
        <RefreshCw className={styles['pull-reveal-icon']} strokeWidth={2.25} />
        <span className={styles['pull-reveal-label']}>
          <span className={styles['pull-reveal-label-text']} data-state="idle">
            Pull to reconnect
          </span>
          <span className={styles['pull-reveal-label-text']} data-state="ready">
            Release to reconnect
          </span>
        </span>
      </div>

      <ErrorBoundary>
        <div className={styles.messages} ref={messagesContainerRef} onScroll={onScroll}>
          <div ref={messagesInnerRef} className={styles['messages-inner']}>
            {hasMore && <div ref={topSentinelRef} className={styles['load-more-sentinel']} />}
            {!hasMore && messages.length > 0 && (
              <div className={styles['top-marker']} aria-hidden="true">
                <span className={styles['top-marker-node']} />
              </div>
            )}
            {isLoadingOlder && (
              <div className={styles['loading-older']}>Loading older messages…</div>
            )}

            {messages.length === 0 && (
              <div className={styles['messages-empty']}>
                {isConnected ? (
                  <>
                    <MessageSquare
                      className={styles['messages-empty-icon']}
                      strokeWidth={1.2}
                      aria-hidden
                    />
                    <div className={styles['messages-empty-title']}>
                      {filterName ? `#${filterName} is quiet` : 'Nothing here yet'}
                    </div>
                    <div className={styles['messages-empty-subtitle']}>
                      Messages from the game will appear here as they arrive.
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle
                      className={styles['messages-empty-icon']}
                      strokeWidth={1.2}
                      aria-hidden
                    />
                    <div className={styles['messages-empty-title']}>Waiting for chat stream...</div>
                    <div className={styles['messages-empty-subtitle']}>
                      Make sure the plugin is running in-game.
                    </div>
                  </>
                )}
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
                onReply={onReply}
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
