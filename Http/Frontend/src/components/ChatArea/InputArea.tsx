import { useCallback, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
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
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M4.146.146A.5.5 0 0 1 4.5 0h7a.5.5 0 0 1 .5.5c0 .68-.342 1.174-.646 1.479-.126.125-.25.224-.354.298v4.431l.078.048c.203.127.476.314.751.555C12.36 7.775 13 8.527 13 9.5a.5.5 0 0 1-.5.5h-4v4.5c0 .276-.224 1.5-.5 1.5s-.5-1.224-.5-1.5V10h-4a.5.5 0 0 1-.5-.5c0-.973.64-1.725 1.17-2.168.276-.241.548-.428.752-.555l.078-.048V2.277a2.77 2.77 0 0 1-.354-.298C4.342 1.674 4 1.179 4 .5a.5.5 0 0 1 .146-.354z" />
    </svg>
  );
}

interface ChatInputRowProps {
  innerClass: string;
  sendChannels: ChannelOption[];
  selectedSendPrefix: string;
  onChannelChange: (prefix: string) => void;
  inTellMode: boolean;
  inputText: string;
  onInputChange: (text: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  placeholder: string;
  isConnected: boolean;
  showCharPicker: boolean;
  onToggleCharPicker: () => void;
  onSend: () => void;
  onExecuteEmote: (command: string) => void;
  emoteConfirm: boolean;
  emoteSortByName: boolean;
  effectiveLimit: number;
  isOverLimit: boolean;
}

function ChatInputRow({
  innerClass,
  sendChannels,
  selectedSendPrefix,
  onChannelChange,
  inTellMode,
  inputText,
  onInputChange,
  onKeyDown,
  placeholder,
  isConnected,
  showCharPicker,
  onToggleCharPicker,
  onSend,
  onExecuteEmote,
  emoteConfirm,
  emoteSortByName,
  effectiveLimit,
  isOverLimit,
}: ChatInputRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mirrorTextRef = useRef<HTMLSpanElement>(null);

  const syncScroll = useCallback(() => {
    if (inputRef.current && mirrorTextRef.current) {
      mirrorTextRef.current.style.transform = `translateX(-${inputRef.current.scrollLeft}px)`;
    }
  }, []);

  const scheduleSync = useCallback(() => {
    requestAnimationFrame(syncScroll);
  }, [syncScroll]);

  const overflowIndex = isOverLimit
    ? findOverflowIndex(inputText, effectiveLimit)
    : inputText.length;

  return (
    <div className={innerClass}>
      <ChannelSelect
        channels={sendChannels}
        value={selectedSendPrefix}
        onChange={onChannelChange}
        tellMode={inTellMode}
      />
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
        <input
          ref={inputRef}
          type="text"
          className={styles['chat-input']}
          placeholder={placeholder}
          value={inputText}
          onChange={(e) => {
            onInputChange(e.target.value);
            scheduleSync();
          }}
          onKeyDown={(e) => {
            onKeyDown(e);
            scheduleSync();
          }}
          onScroll={syncScroll}
          onClick={scheduleSync}
          onSelect={scheduleSync}
          disabled={!isConnected}
          autoFocus
        />
      </div>
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
      <button
        type="button"
        className={styles['send-btn']}
        onClick={onSend}
        disabled={!inputText.trim() || !isConnected || isOverLimit}
        data-over-limit={isOverLimit ? 'true' : undefined}
        aria-label="Send"
        data-tooltip="Send Message"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M14 8L2 2L5.5 8L2 14L14 8Z" fill="currentColor" />
        </svg>
      </button>
      {showCharPicker && (
        <EmoteSymbolPicker
          onInsert={(text) => onInputChange(inputText + text)}
          onExecute={onExecuteEmote}
          emoteConfirm={emoteConfirm}
          emoteSortByName={emoteSortByName}
        />
      )}
    </div>
  );
}

interface Props {
  isConnected: boolean;
  sendChannels: ChannelOption[];
  selectedSendPrefix: string;
  showCharPicker: boolean;
  ctrlEnterToSend: boolean;
  onSend: (text: string) => void;
  onSendPrefixChange: (prefix: string) => void;
  onToggleCharPicker: () => void;
  onExecuteEmote: (command: string) => void;
  emoteConfirm: boolean;
  emoteSortByName: boolean;
  replyTarget: { name: string; world?: string } | null;
  replyPinned: boolean;
  isDmView?: boolean;
  onClearReply: () => void;
  onToggleReplyPin: () => void;
}

export function InputArea({
  isConnected,
  sendChannels,
  selectedSendPrefix,
  showCharPicker,
  ctrlEnterToSend,
  onSend,
  onSendPrefixChange,
  onToggleCharPicker,
  onExecuteEmote,
  emoteConfirm,
  emoteSortByName,
  replyTarget,
  replyPinned,
  isDmView = false,
  onClearReply,
  onToggleReplyPin,
}: Props) {
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

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (ctrlEnterToSend && !e.ctrlKey) return;
      e.preventDefault();
      handleSend();
    }
  };

  const rowProps = {
    sendChannels,
    selectedSendPrefix,
    onChannelChange: handleChannelChange,
    inTellMode,
    inputText,
    onInputChange: setInputText,
    onKeyDown: handleKeyDown,
    placeholder,
    isConnected,
    showCharPicker,
    onToggleCharPicker,
    onSend: handleSend,
    onExecuteEmote,
    emoteConfirm,
    emoteSortByName,
    effectiveLimit,
    isOverLimit,
  };

  return (
    <div className={styles['input-area']} ref={inputAreaRef}>
      {inTellMode ? (
        <div className={styles['tell-mode-container']}>
          <div className={styles['tell-banner']}>
            <span className={styles['tell-banner-label']}>Tell to</span>
            <div className={styles['tell-avatar']}>
              <AvatarImage name={replyTarget!.name} world={replyTarget!.world} />
            </div>
            <span className={styles['tell-banner-name']}>{replyTargetLabel}</span>
            {!isDmView && (
              <button
                type="button"
                className={`${styles['tell-pin-btn']}${replyPinned ? ` ${styles.pinned}` : ''}`}
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
