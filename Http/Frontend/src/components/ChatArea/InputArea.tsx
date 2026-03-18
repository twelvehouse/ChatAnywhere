import { useRef } from 'react';
import type { KeyboardEvent } from 'react';
import styles from './InputArea.module.css';
import { ChannelSelect } from '../ChannelSelect/ChannelSelect';
import { SpecialCharPicker } from '../SpecialCharPicker/SpecialCharPicker';
import { AvatarImage } from './AvatarImage';
import { getBadgeInfoByPrefix } from '../../lib/channelUtils';
import type { ChannelOption } from '../../types/chat';

// Thumbtack / pin icon SVG (Bootstrap-style)
function PinIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M4.146.146A.5.5 0 0 1 4.5 0h7a.5.5 0 0 1 .5.5c0 .68-.342 1.174-.646 1.479-.126.125-.25.224-.354.298v4.431l.078.048c.203.127.476.314.751.555C12.36 7.775 13 8.527 13 9.5a.5.5 0 0 1-.5.5h-4v4.5c0 .276-.224 1.5-.5 1.5s-.5-1.224-.5-1.5V10h-4a.5.5 0 0 1-.5-.5c0-.973.64-1.725 1.17-2.168.276-.241.548-.428.752-.555l.078-.048V2.277a2.77 2.77 0 0 1-.354-.298C4.342 1.674 4 1.179 4 .5a.5.5 0 0 1 .146-.354z" />
    </svg>
  );
}

interface Props {
  inputText: string;
  isConnected: boolean;
  sendChannels: ChannelOption[];
  selectedSendPrefix: string;
  showCharPicker: boolean;
  onInputChange: (text: string) => void;
  onSendPrefixChange: (prefix: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onSendClick: () => void;
  onToggleCharPicker: () => void;
  replyTarget: { name: string; world?: string } | null;
  replyPinned: boolean;
  onClearReply: () => void;
  onToggleReplyPin: () => void;
}

export function InputArea({
  inputText,
  isConnected,
  sendChannels,
  selectedSendPrefix,
  showCharPicker,
  onInputChange,
  onSendPrefixChange,
  onKeyDown,
  onSendClick,
  onToggleCharPicker,
  replyTarget,
  replyPinned,
  onClearReply,
  onToggleReplyPin,
}: Props) {
  const inputAreaRef = useRef<HTMLDivElement>(null);
  const charPickerRef = useRef<HTMLDivElement>(null);

  const currentChannel =
    sendChannels.find((c) => c.prefix === selectedSendPrefix) ?? sendChannels[0];
  const inTellMode = replyTarget !== null;
  const replyTargetLabel = replyTarget
    ? replyTarget.world
      ? `${replyTarget.name}@${replyTarget.world}`
      : replyTarget.name
    : '';
  const placeholder = isConnected
    ? inTellMode
      ? `Tell ${replyTargetLabel}...`
      : `Message as ${currentChannel ? getBadgeInfoByPrefix(currentChannel.prefix).label : 'chat'}...`
    : 'Connecting to server...';

  const handleChannelChange = (prefix: string) => {
    onSendPrefixChange(prefix);
    if (inTellMode) onClearReply();
  };

  // Shared input row content
  const inputRowContent = (innerClass: string) => (
    <div className={innerClass}>
      <ChannelSelect
        channels={sendChannels}
        value={selectedSendPrefix}
        onChange={handleChannelChange}
        tellMode={inTellMode}
      />
      <div className={styles['input-divider']} />
      <input
        type="text"
        className={styles['chat-input']}
        placeholder={placeholder}
        value={inputText}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={!isConnected}
        autoFocus
      />
      <button
        type="button"
        className={styles['char-picker-btn']}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={onToggleCharPicker}
        aria-label="Special Characters"
        data-tooltip="Special Characters"
        data-picker-open={showCharPicker ? 'true' : undefined}
      >
        <span className={styles['char-picker-icon']}>&#xE03E;</span>
      </button>
      <button
        type="button"
        className={styles['send-btn']}
        onClick={onSendClick}
        disabled={!inputText.trim() || !isConnected}
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
        <SpecialCharPicker
          onSelect={(char) => onInputChange(inputText + char)}
          containerRef={charPickerRef}
        />
      )}
    </div>
  );

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
            <button
              type="button"
              className={`${styles['tell-pin-btn']}${replyPinned ? ` ${styles.pinned}` : ''}`}
              onClick={onToggleReplyPin}
              aria-label={replyPinned ? 'Unpin (auto-dismiss after send)' : 'Pin (keep after send)'}
              data-tooltip={replyPinned ? 'Keep after send' : 'Send once'}
            >
              <PinIcon />
              <span>{replyPinned ? 'Pinned' : 'Pin'}</span>
            </button>
            <button
              type="button"
              className={styles['tell-dismiss-btn']}
              onClick={onClearReply}
              aria-label="Exit Tell mode"
              data-tooltip="Cancel"
            >
              ×
            </button>
          </div>
          {inputRowContent(styles['tell-input-inner'])}
        </div>
      ) : (
        inputRowContent(styles['chat-input-wrapper'])
      )}
    </div>
  );
}
