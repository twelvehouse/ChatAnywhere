import { useEffect, useRef, useState } from 'react';
import type { ClipboardEvent, KeyboardEvent } from 'react';
import clsx from 'clsx';
import { Pin, SendHorizontal } from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { useSessionStore } from '../../store/sessionStore';
import { useTheme } from '../../hooks/useTheme';
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

interface ChatInputRowProps {
  innerClass: string;
  sendChannels: ChannelOption[];
  selectedSendPrefix: string;
  onChannelChange: (prefix: string) => void;
  inTellMode: boolean;
  isDmView: boolean;
  inputText: string;
  onInputChange: (text: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
  isConnected: boolean;
  showCharPicker: boolean;
  onToggleCharPicker: () => void;
  onSend: () => void;
  onExecuteEmote: (command: string) => void;
  effectiveLimit: number;
  isOverLimit: boolean;
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
  onExecuteEmote,
  effectiveLimit,
  isOverLimit,
}: ChatInputRowProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mirrorTextRef = useRef<HTMLSpanElement>(null);

  // Match the mirror element's height so the overflow highlight stays aligned
  // with the textarea as it grows vertically.
  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }, [inputText]);

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

  const overflowIndex = isOverLimit
    ? findOverflowIndex(inputText, effectiveLimit)
    : inputText.length;

  return (
    <div className={innerClass}>
      {/* Each control sits in a fixed-height "slot" so the textarea is the
          only element that grows downward when the message wraps. */}
      <div className={styles.slot}>
        <ChannelSelect
          channels={sendChannels}
          value={selectedSendPrefix}
          onChange={onChannelChange}
          tellMode={inTellMode}
          locked={isDmView}
        />
      </div>
      <div className={styles['input-divider']} />
      <div className={styles['input-container']}>
        {isOverLimit && (
          <div className={styles['input-mirror']} aria-hidden="true">
            <span ref={mirrorTextRef} className={styles['mirror-text']}>
              {inputText.slice(0, overflowIndex)}
              <span className={styles['overflow-highlight']}>{inputText.slice(overflowIndex)}</span>
            </span>
          </div>
        )}
        <textarea
          ref={inputRef}
          rows={1}
          className={styles['chat-input']}
          placeholder={placeholder}
          value={inputText}
          onChange={(e) => onInputChange(stripNewlines(e.target.value))}
          onKeyDown={onKeyDown}
          onPaste={handlePaste}
          disabled={!isConnected}
          autoFocus
        />
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
        >
          <span className={styles['char-picker-icon']}>&#xE03E;</span>
        </button>
      </div>
      <div className={styles.slot}>
        <button
          type="button"
          className={styles['send-btn']}
          onClick={onSend}
          disabled={!inputText.trim() || !isConnected || isOverLimit}
          data-over-limit={isOverLimit ? 'true' : undefined}
          aria-label="Send"
          data-tooltip="Send Message"
        >
          <SendHorizontal size={16} fill="currentColor" strokeWidth={0} aria-hidden />
        </button>
      </div>
      {showCharPicker && (
        <EmoteSymbolPicker
          onInsert={(text) => onInputChange(inputText + text)}
          onExecute={onExecuteEmote}
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
  const theme = useTheme();
  const isConnected = useSessionStore((s) => s.isConnected);
  const inputAreaRef = useRef<HTMLDivElement>(null);
  const [inputText, setInputText] = useState('');

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

  const handleSend = () => {
    if (!inputText.trim() || !isConnected || isOverLimit) return;
    onSend(inputText);
    setInputText('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      // The game's chat API doesn't accept newlines, so we never let Enter (or
      // Shift+Enter) insert one — it either sends or is a no-op.
      e.preventDefault();
      if (ctrlEnterToSend && !e.ctrlKey) return;
      handleSend();
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
    onSend: handleSend,
    onExecuteEmote,
    effectiveLimit,
    isOverLimit,
  };

  return (
    <div className={styles['input-area']} ref={inputAreaRef}>
      {inTellMode ? (
        <div className={styles['tell-mode-container']} style={theme.tellVars}>
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
              >
                ×
              </button>
            )}
          </div>
          <ChatInputRow {...rowProps} innerClass={styles['tell-input-inner']} />
        </div>
      ) : (
        <ChatInputRow {...rowProps} innerClass={styles['chat-input-wrapper']} />
      )}
    </div>
  );
}
