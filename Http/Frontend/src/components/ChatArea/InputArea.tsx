import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { ClipboardEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import clsx from 'clsx';
import { Pin, SendHorizontal } from 'lucide-react';
import { RichTextarea, type RichTextareaHandle } from 'rich-textarea';
import { CountdownCircleTimer } from 'react-countdown-circle-timer';
import { useSettingsStore } from '../../store/settingsStore';
import { useSessionStore } from '../../store/sessionStore';
import { usePendingSendStore } from '../../store/pendingSendStore';
import { useTheme } from '../../hooks/useTheme';
import { useEffectiveTheme } from '../../hooks/useEffectiveTheme';
import styles from './InputArea.module.css';
import { ChannelSelect } from '../ChannelSelect/ChannelSelect';
import { EmoteSymbolPicker } from '../EmoteSymbolPicker/EmoteSymbolPicker';
import { AvatarImage } from './AvatarImage';
import { getBadgeInfoByPrefix } from '../../lib/channelUtils';
import { formatPlayerName } from '../../lib/formatUtils';
import type { ChannelOption } from '../../types/chat';

const MAX_BYTES = 500;

function getUtf8ByteLength(str: string): number {
  return new TextEncoder().encode(str).length;
}

function findOverflowIndex(text: string, maxBytes: number): number {
  let byteCount = 0;
  for (let i = 0; i < text.length; ) {
    const cp = text.codePointAt(i)!;
    const charLen = cp > 0xffff ? 2 : 1;
    const charBytes = cp <= 0x7f ? 1 : cp <= 0x7ff ? 2 : cp <= 0xffff ? 3 : 4;
    if (byteCount + charBytes > maxBytes) return i;
    byteCount += charBytes;
    i += charLen;
  }
  return text.length;
}

function PinIcon() {
  return <Pin size="1em" aria-hidden />;
}

/** Strip every line break from a string. Game chat doesn't accept newlines. */
function stripNewlines(text: string): string {
  return text.replace(/[\r\n]+/g, '');
}

function PendingSendBanner({
  duration,
  onComplete,
  onCancel,
}: {
  duration: number;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const effectiveTheme = useEffectiveTheme();
  // Matches --accent per theme.
  const colors = effectiveTheme === 'dark' ? '#89b4fa' : '#4a7de6';
  const trailColor =
    effectiveTheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
  return (
    <button
      type="button"
      className={styles['pending-banner']}
      onClick={onCancel}
      aria-label="Cancel pending send"
    >
      <div className={styles['pending-circle']} aria-hidden>
        <CountdownCircleTimer
          isPlaying
          duration={duration}
          colors={colors}
          trailColor={trailColor}
          size={18}
          strokeWidth={2.5}
          onComplete={() => {
            onComplete();
            return { shouldRepeat: false };
          }}
        />
      </div>
      <span className={styles['pending-label']}>Queued</span>
      <span className={styles['pending-hint']}>Tap to cancel</span>
    </button>
  );
}

interface ChatInputRowProps {
  innerClass: string;
  sendChannels: ChannelOption[];
  selectedSendPrefix: string;
  onChannelChange: (prefix: string) => void;
  inTellMode: boolean;
  isDmView: boolean;
  inputText: string;
  onInputChange: (text: string) => void;
  onKeyDown: (e: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
  isConnected: boolean;
  showCharPicker: boolean;
  onToggleCharPicker: () => void;
  onSend: () => void;
  effectiveLimit: number;
  isOverLimit: boolean;
  isLocked: boolean;
  onCancelPending: () => void;
}

function ChatInputRow({
  innerClass,
  sendChannels,
  selectedSendPrefix,
  onChannelChange,
  inTellMode,
  isDmView,
  inputText,
  onInputChange,
  onKeyDown,
  placeholder,
  isConnected,
  showCharPicker,
  onToggleCharPicker,
  onSend,
  effectiveLimit,
  isOverLimit,
  isLocked,
  onCancelPending,
}: ChatInputRowProps) {
  const inputRef = useRef<RichTextareaHandle>(null);
  const chatFontSize = useSettingsStore((s) => s.fontSize);
  const chatFontFamily = useSettingsStore((s) => s.fontFamily);

  // Drive font via inline style so rich-textarea's backdrop sync runs against
  // resolved values, not CSS variables that may not have settled yet.
  const composerScale = Math.max(1, chatFontSize / 15);
  const richStyle: CSSProperties = {
    width: '100%',
    maxHeight: '30vh',
    fontSize: Math.max(16, chatFontSize), // iOS auto-zoom floor
    fontFamily: `"${chatFontFamily}", FFXIV-Lodestone, system-ui, -apple-system, sans-serif`,
    lineHeight: `${22 * composerScale}px`,
    padding: `${5 * composerScale}px 0`,
    minHeight: `${32 * composerScale}px`,
  };

  // rich-textarea's autoHeight counts the placeholder in scrollHeight, so we
  // recompute height ourselves with an empty-text guard.
  useLayoutEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    if (!inputText) {
      ta.style.height = '';
      return;
    }
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }, [inputText]);

  useEffect(() => {
    const recompute = () => {
      const ta = inputRef.current;
      if (!ta || !ta.value) return;
      ta.style.height = 'auto';
      ta.style.height = `${ta.scrollHeight}px`;
    };
    window.addEventListener('resize', recompute);
    return () => window.removeEventListener('resize', recompute);
  }, []);

  // Returning from a queue cancel: restore focus and place caret at end.
  useEffect(() => {
    if (isLocked) return;
    const ta = inputRef.current;
    if (!ta) return;
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
  }, [isLocked]);

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (!/[\r\n]/.test(pasted)) return; // no newlines → let the browser handle it
    e.preventDefault();
    const cleaned = stripNewlines(pasted);
    const ta = e.currentTarget;
    const { selectionStart, selectionEnd, value } = ta;
    const next = value.slice(0, selectionStart) + cleaned + value.slice(selectionEnd);
    onInputChange(next);
    // Restore the caret after React re-renders.
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = selectionStart + cleaned.length;
    });
  };

  return (
    <div className={clsx(innerClass, isLocked && styles['is-locked'])}>
      {/* Each control sits in a fixed-height "slot" so the textarea is the
          only element that grows downward when the message wraps. */}
      <div className={styles.slot}>
        <ChannelSelect
          channels={sendChannels}
          value={selectedSendPrefix}
          onChange={onChannelChange}
          tellMode={inTellMode}
          locked={isDmView || isLocked}
        />
      </div>
      <div className={styles['input-divider']} />
      <div className={styles['input-container']}>
        <RichTextarea
          ref={inputRef}
          rows={1}
          style={richStyle}
          className={styles['chat-input']}
          placeholder={placeholder}
          value={inputText}
          onChange={(e) => onInputChange(stripNewlines(e.target.value))}
          onKeyDown={onKeyDown}
          onPaste={handlePaste}
          disabled={!isConnected || isLocked}
          autoFocus
        >
          {(value) => {
            if (!isOverLimit) return value;
            const idx = findOverflowIndex(value, effectiveLimit);
            return (
              <>
                {value.slice(0, idx)}
                <span className={styles['overflow-highlight']}>{value.slice(idx)}</span>
              </>
            );
          }}
        </RichTextarea>
      </div>
      <div className={styles.slot}>
        <button
          type="button"
          className={styles['char-picker-btn']}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onToggleCharPicker}
          aria-label="Emotes & Symbols"
          data-tooltip="Emotes & Symbols"
          data-picker-open={showCharPicker ? 'true' : undefined}
          disabled={isLocked}
        >
          <span className={styles['char-picker-icon']}>&#xE03E;</span>
        </button>
      </div>
      <div className={styles.slot}>
        <button
          type="button"
          className={styles['send-btn']}
          onClick={onSend}
          disabled={isLocked || !inputText.trim() || !isConnected || isOverLimit}
          data-over-limit={isOverLimit ? 'true' : undefined}
          aria-label="Send"
          data-tooltip="Send Message"
        >
          <SendHorizontal size={16} fill="currentColor" strokeWidth={0} aria-hidden />
        </button>
      </div>
      {/* Catches clicks inside the input row; PendingSendBackdrop handles the rest of the page. */}
      {isLocked && (
        <button
          type="button"
          className={styles['pending-overlay']}
          onClick={onCancelPending}
          aria-label="Cancel pending send"
        />
      )}
    </div>
  );
}

interface Props {
  sendChannels: ChannelOption[];
  selectedSendPrefix: string;
  showCharPicker: boolean;
  onSend: (text: string) => void;
  onSendPrefixChange: (prefix: string) => void;
  onToggleCharPicker: () => void;
  onExecuteEmote: (command: string) => void;
  replyTarget: { name: string; world?: string } | null;
  replyPinned: boolean;
  isDmView?: boolean;
  onClearReply: () => void;
  onToggleReplyPin: () => void;
}

export function InputArea({
  sendChannels,
  selectedSendPrefix,
  showCharPicker,
  onSend,
  onSendPrefixChange,
  onToggleCharPicker,
  onExecuteEmote,
  replyTarget,
  replyPinned,
  isDmView = false,
  onClearReply,
  onToggleReplyPin,
}: Props) {
  const ctrlEnterToSend = useSettingsStore((s) => s.ctrlEnterToSend);
  const sendDelayEnabled = useSettingsStore((s) => s.sendDelayEnabled);
  const sendDelaySeconds = useSettingsStore((s) => s.sendDelaySeconds);
  const sendDelayAlwaysQueue = useSettingsStore((s) => s.sendDelayAlwaysQueue);
  const setPendingCancelHandler = usePendingSendStore((s) => s.setCancelHandler);
  const theme = useTheme();
  const isConnected = useSessionStore((s) => s.isConnected);
  const inputAreaRef = useRef<HTMLDivElement>(null);
  const [inputText, setInputText] = useState('');
  // Snapshot so settings changes mid-countdown don't shift the timer.
  const [pendingDuration, setPendingDuration] = useState(0);
  const isPending = pendingDuration > 0;
  const pendingTriggerRef = useRef<'kbd' | 'mouse'>('mouse');

  useEffect(() => {
    if (!isPending) return;
    setPendingCancelHandler(() => setPendingDuration(0));
    return () => setPendingCancelHandler(null);
  }, [isPending, setPendingCancelHandler]);

  // Escape always cancels. Enter cancels too, but for kbd-triggered pending we
  // wait for Enter to be released first so auto-repeat doesn't self-cancel.
  useEffect(() => {
    if (!isPending) return;
    let enterArmed = pendingTriggerRef.current === 'mouse';
    const armEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter') enterArmed = true;
    };
    const cancel = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setPendingDuration(0);
        return;
      }
      if (e.key === 'Enter' && enterArmed) {
        e.preventDefault();
        setPendingDuration(0);
      }
    };
    if (!enterArmed) document.addEventListener('keyup', armEnter);
    document.addEventListener('keydown', cancel);
    return () => {
      document.removeEventListener('keyup', armEnter);
      document.removeEventListener('keydown', cancel);
    };
  }, [isPending]);

  const currentChannel =
    sendChannels.find((c) => c.prefix === selectedSendPrefix) ?? sendChannels[0];
  const inTellMode = replyTarget !== null;

  const prefixBytes =
    inTellMode && replyTarget
      ? getUtf8ByteLength(`/tell ${formatPlayerName(replyTarget.name, replyTarget.world)} `)
      : getUtf8ByteLength(selectedSendPrefix);
  const effectiveLimit = Math.max(1, MAX_BYTES - prefixBytes);
  const isOverLimit = getUtf8ByteLength(inputText) > effectiveLimit;
  const replyTargetLabel = replyTarget ? formatPlayerName(replyTarget.name, replyTarget.world) : '';
  const placeholder = isConnected
    ? inTellMode
      ? `Tell ${replyTargetLabel}...`
      : `Message as ${currentChannel ? getBadgeInfoByPrefix(currentChannel.prefix).label : 'chat'}...`
    : 'Connecting to server...';

  const handleChannelChange = (prefix: string) => {
    onSendPrefixChange(prefix);
    if (inTellMode) onClearReply();
  };

  const dispatchSend = () => {
    onSend(inputText);
    setInputText('');
    setPendingDuration(0);
  };

  // explicit = Ctrl+Enter or Send button click; bypasses the queue unless sendDelayAlwaysQueue is on.
  const handleSend = (explicit: boolean) => {
    if (!inputText.trim() || !isConnected || isOverLimit) return;
    const shouldQueue =
      sendDelayEnabled && sendDelaySeconds > 0 && (sendDelayAlwaysQueue || !explicit);
    if (shouldQueue) {
      setPendingDuration(sendDelaySeconds);
      return;
    }
    dispatchSend();
  };

  const handleCancelPending = () => {
    setPendingDuration(0);
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      // The game's chat API doesn't accept newlines, so we never let Enter (or
      // Shift+Enter) insert one — it either sends or is a no-op.
      e.preventDefault();
      // While pending, defer to the document-level Enter handler so we don't
      // accidentally re-queue and reset the countdown.
      if (isPending) return;
      if (ctrlEnterToSend && !e.ctrlKey) return;
      pendingTriggerRef.current = 'kbd';
      handleSend(e.ctrlKey);
    }
  };

  const rowProps = {
    sendChannels,
    selectedSendPrefix,
    onChannelChange: handleChannelChange,
    inTellMode,
    isDmView,
    inputText,
    onInputChange: setInputText,
    onKeyDown: handleKeyDown,
    placeholder,
    isConnected,
    showCharPicker,
    onToggleCharPicker,
    onSend: () => {
      pendingTriggerRef.current = 'mouse';
      handleSend(true);
    },
    effectiveLimit,
    isOverLimit,
    isLocked: isPending,
    onCancelPending: handleCancelPending,
  };

  const pendingBanner = isPending ? (
    <PendingSendBanner
      duration={pendingDuration}
      onComplete={dispatchSend}
      onCancel={handleCancelPending}
    />
  ) : null;

  return (
    <div
      className={clsx(styles['input-area'], isPending && styles['input-area-pending'])}
      ref={inputAreaRef}
    >
      {inTellMode ? (
        <div
          className={clsx(styles['tell-mode-container'], isPending && styles.lifted)}
          style={theme.tellVars}
        >
          <div className={styles['tell-banner']}>
            <span className={styles['tell-banner-label']}>Tell to</span>
            <div className={styles['tell-avatar']}>
              <AvatarImage name={replyTarget!.name} world={replyTarget!.world} />
            </div>
            <span className={styles['tell-banner-name']}>{replyTargetLabel}</span>
            {!isDmView && (
              <button
                type="button"
                className={clsx(styles['tell-pin-btn'], replyPinned && styles.pinned)}
                onClick={onToggleReplyPin}
                aria-label={
                  replyPinned ? 'Unpin (auto-dismiss after send)' : 'Pin (keep after send)'
                }
                data-tooltip={replyPinned ? 'Keep after send' : 'Send once'}
                disabled={isPending}
              >
                <PinIcon />
                <span>{replyPinned ? 'Pinned' : 'Pin'}</span>
              </button>
            )}
            {!isDmView && (
              <button
                type="button"
                className={styles['tell-dismiss-btn']}
                onClick={onClearReply}
                aria-label="Exit Tell mode"
                data-tooltip="Cancel"
                disabled={isPending}
              >
                ×
              </button>
            )}
          </div>
          {pendingBanner}
          <ChatInputRow {...rowProps} innerClass={styles['tell-input-inner']} />
        </div>
      ) : isPending ? (
        <div className={styles['pending-mode-container']}>
          {pendingBanner}
          <ChatInputRow {...rowProps} innerClass={styles['pending-input-inner']} />
        </div>
      ) : (
        <ChatInputRow {...rowProps} innerClass={styles['chat-input-wrapper']} />
      )}
      {showCharPicker && !isPending && (
        <EmoteSymbolPicker
          onInsert={(text) => setInputText(inputText + text)}
          onExecute={onExecuteEmote}
        />
      )}
    </div>
  );
}
