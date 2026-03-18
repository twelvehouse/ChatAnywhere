import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { ChatMessage } from '../../types/chat';
import styles from './AppearanceSettings.module.css';
import { FONTS } from '../../constants/config';
import { MessageItem } from '../ChatArea/MessageItem';

// Static preview messages — defined at module level to avoid purity lint warnings
const PREVIEW_BASE_TIME = Date.now();

const PREVIEW_SHOUT: ChatMessage = {
  Type: 11,
  SenderName: "Yoshi'p Sampo",
  SenderWorld: 'Aegis',
  MessagePayloads: [{ Type: 'text', Text: 'Hear... Feel... Think...' }],
  Timestamp: PREVIEW_BASE_TIME,
};

const PREVIEW_EMOTE: ChatMessage = {
  Type: 28,
  SenderName: "Yoshi'p Sampo",
  SenderWorld: 'Aegis',
  MessagePayloads: [
    {
      Type: 'text',
      Text: "Yoshi'p Sampo swipes at their tomestone and checks their messages.",
    },
  ],
  Timestamp: PREVIEW_BASE_TIME + 30000,
};

const NOOP = () => {};

interface Props {
  fontFamily: string;
  fontSize: number;
  italicizeSystem: boolean;
  useColoredBackground: boolean;
  setFontFamily: Dispatch<SetStateAction<string>>;
  setFontSize: Dispatch<SetStateAction<number>>;
  setItalicizeSystem: Dispatch<SetStateAction<boolean>>;
  setUseColoredBackground: Dispatch<SetStateAction<boolean>>;
}

export function AppearanceSettings({
  fontFamily,
  fontSize,
  italicizeSystem,
  useColoredBackground,
  setFontFamily,
  setFontSize,
  setItalicizeSystem,
  setUseColoredBackground,
}: Props) {
  const [previewTime] = useState(() => Date.now());

  // Re-stamp preview messages with a stable time captured at component mount
  const shoutMsg = { ...PREVIEW_SHOUT, Timestamp: previewTime };
  const emoteMsg = { ...PREVIEW_EMOTE, Timestamp: previewTime + 30000 };

  return (
    <>
      <div className="settings-section">
        <MessageItem
          msg={shoutMsg}
          prevMsg={null}
          nextMsg={emoteMsg}
          tellRef={null}
          onLinkClick={NOOP}
          italicizeSystem={italicizeSystem}
          useColoredBackground={useColoredBackground}
          tellModeAll={false}
          onReply={NOOP}
        />
        <MessageItem
          msg={emoteMsg}
          prevMsg={shoutMsg}
          nextMsg={null}
          tellRef={null}
          onLinkClick={NOOP}
          italicizeSystem={italicizeSystem}
          useColoredBackground={useColoredBackground}
          tellModeAll={false}
          onReply={NOOP}
        />
      </div>

      <div className="settings-section">
        <h3>Font</h3>
        <p>
          Change the main text font. FFXIV special characters use a dedicated font regardless of
          this setting.
        </p>
        <div className={styles['font-input-container']}>
          <input
            list="font-list"
            className={styles['settings-input']}
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            placeholder="Font name (e.g. Noto Sans JP)"
          />
          <datalist id="font-list">
            {FONTS.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </div>

        <div className="settings-inline-row" style={{ marginTop: '16px' }}>
          <span className="settings-inline-label">Size</span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flex: 1,
              justifyContent: 'flex-end',
            }}
          >
            <span className="settings-inline-label" style={{ opacity: 0.7, fontSize: '0.85rem' }}>
              {fontSize}px
            </span>
            <input
              type="range"
              className={styles['settings-range']}
              min="11"
              max="24"
              step="1"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
            />
          </div>
        </div>

        <div
          className="settings-inline-row"
          style={{ marginTop: '16px', cursor: 'pointer' }}
          onClick={() => setItalicizeSystem((v) => !v)}
        >
          <span className="settings-inline-label">Italicize System & Emote</span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flex: 1,
              justifyContent: 'flex-end',
            }}
          >
            <div className={`toggle-switch${italicizeSystem ? ' on' : ''}`}>
              <div className="toggle-knob" />
            </div>
          </div>
        </div>

        <div
          className="settings-inline-row"
          style={{ marginTop: '16px', cursor: 'pointer' }}
          onClick={() => setUseColoredBackground((v) => !v)}
        >
          <span className="settings-inline-label">Colorize backgrounds by type</span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flex: 1,
              justifyContent: 'flex-end',
            }}
          >
            <div className={`toggle-switch${useColoredBackground ? ' on' : ''}`}>
              <div className="toggle-knob" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
