import clsx from 'clsx';
import type { ChatMessage } from '../../types/chat';
import styles from './AppearanceSettings.module.css';
import { FONTS } from '../../constants/config';
import { MessageItem } from '../ChatArea/MessageItem';
import { useSettingsStore } from '../../store/settingsStore';

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

export function AppearanceSettings() {
  const fontFamily = useSettingsStore((s) => s.fontFamily);
  const fontSize = useSettingsStore((s) => s.fontSize);
  const italicizeSystem = useSettingsStore((s) => s.italicizeSystem);
  const useColoredBackground = useSettingsStore((s) => s.useColoredBackground);
  const largeLinkPreviews = useSettingsStore((s) => s.largeLinkPreviews);
  const setFontFamily = useSettingsStore((s) => s.setFontFamily);
  const setFontSize = useSettingsStore((s) => s.setFontSize);
  const setItalicizeSystem = useSettingsStore((s) => s.setItalicizeSystem);
  const setUseColoredBackground = useSettingsStore((s) => s.setUseColoredBackground);
  const setLargeLinkPreviews = useSettingsStore((s) => s.setLargeLinkPreviews);
  return (
    <>
      <div className="form-section">
        <MessageItem
          msg={PREVIEW_SHOUT}
          prevMsg={null}
          nextMsg={PREVIEW_EMOTE}
          tellRef={null}
          onLinkClick={NOOP}
          italicizeSystem={italicizeSystem}
          useColoredBackground={useColoredBackground}
          tellModeAll={false}
          onReply={NOOP}
        />
        <MessageItem
          msg={PREVIEW_EMOTE}
          prevMsg={PREVIEW_SHOUT}
          nextMsg={null}
          tellRef={null}
          onLinkClick={NOOP}
          italicizeSystem={italicizeSystem}
          useColoredBackground={useColoredBackground}
          tellModeAll={false}
          onReply={NOOP}
        />
      </div>

      <div className="form-section">
        <div className="form-section-title">FONT</div>
        <p>
          Change the main text font. FFXIV special characters use a dedicated font regardless of
          this setting.
        </p>
        <div className={styles['font-input-container']}>
          <input
            list="font-list"
            className="form-input"
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

        <div className="form-row">
          <span className="form-row-label">Size</span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flex: 1,
              justifyContent: 'flex-end',
            }}
          >
            <span className="form-row-label" style={{ opacity: 0.7 }}>
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
          className="form-row"
          style={{ cursor: 'pointer' }}
          onClick={() => setItalicizeSystem(!italicizeSystem)}
        >
          <span className="form-row-label">Italicize System & Emote</span>
          <div className={clsx('toggle-switch', italicizeSystem && 'on')}>
            <div className="toggle-knob" />
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">DISPLAY</div>
        <div
          className="form-row"
          style={{ cursor: 'pointer' }}
          onClick={() => setUseColoredBackground(!useColoredBackground)}
        >
          <span className="form-row-label">Colorize backgrounds by type</span>
          <div className={clsx('toggle-switch', useColoredBackground && 'on')}>
            <div className="toggle-knob" />
          </div>
        </div>

        <div
          className="form-row"
          style={{ cursor: 'pointer' }}
          onClick={() => setLargeLinkPreviews(!largeLinkPreviews)}
        >
          <span className="form-row-label">Large link previews</span>
          <div className={clsx('toggle-switch', largeLinkPreviews && 'on')}>
            <div className="toggle-knob" />
          </div>
        </div>
      </div>
    </>
  );
}
