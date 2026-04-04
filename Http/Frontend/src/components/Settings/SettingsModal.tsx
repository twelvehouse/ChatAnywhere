import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import styles from './SettingsModal.module.css';
import { AppearanceSettings } from './AppearanceSettings';
import { ChannelSettings } from './ChannelSettings';
import { SecuritySettings } from './SecuritySettings';
import { OthersSettings } from './OthersSettings';
import type { ChannelOption } from '../../types/chat';

type SettingsCategory = 'appearance' | 'channels' | 'security' | 'others';

interface Props {
  // Appearance
  fontFamily: string;
  fontSize: number;
  italicizeSystem: boolean;
  useColoredBackground: boolean;
  setFontFamily: Dispatch<SetStateAction<string>>;
  setFontSize: Dispatch<SetStateAction<number>>;
  setItalicizeSystem: Dispatch<SetStateAction<boolean>>;
  setUseColoredBackground: Dispatch<SetStateAction<boolean>>;
  // Channels
  serverChannels: ChannelOption[];
  disabledChannels: Set<string>;
  selectedSendPrefix: string;
  setDisabledChannels: Dispatch<SetStateAction<Set<string>>>;
  setSelectedSendPrefix: Dispatch<SetStateAction<string>>;
  // Security
  trustedDomains: Set<string>;
  setTrustedDomains: Dispatch<SetStateAction<Set<string>>>;
  // Others
  tellModeAll: boolean;
  setTellModeAll: Dispatch<SetStateAction<boolean>>;
  ctrlEnterToSend: boolean;
  setCtrlEnterToSend: Dispatch<SetStateAction<boolean>>;
  emoteConfirm: boolean;
  setEmoteConfirm: Dispatch<SetStateAction<boolean>>;
  emoteSortByName: boolean;
  setEmoteSortByName: Dispatch<SetStateAction<boolean>>;
  retainSyncSendPrefix: boolean;
  setRetainSyncSendPrefix: Dispatch<SetStateAction<boolean>>;
  // Control
  onClose: () => void;
}

export function SettingsModal({
  fontFamily,
  fontSize,
  italicizeSystem,
  useColoredBackground,
  setFontFamily,
  setFontSize,
  setItalicizeSystem,
  setUseColoredBackground,
  serverChannels,
  disabledChannels,
  selectedSendPrefix,
  setDisabledChannels,
  setSelectedSendPrefix,
  trustedDomains,
  setTrustedDomains,
  tellModeAll,
  setTellModeAll,
  ctrlEnterToSend,
  setCtrlEnterToSend,
  emoteConfirm,
  setEmoteConfirm,
  emoteSortByName,
  setEmoteSortByName,
  retainSyncSendPrefix,
  setRetainSyncSendPrefix,
  onClose,
}: Props) {
  const [category, setCategory] = useState<SettingsCategory>('appearance');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleClose = () => {
    setCategory('appearance');
    setIsSidebarOpen(false);
    onClose();
  };

  const selectCategory = (cat: SettingsCategory) => {
    setCategory(cat);
    setIsSidebarOpen(false);
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className={styles['settings-modal']} onClick={(e) => e.stopPropagation()}>
        {isSidebarOpen && (
          <div
            className={styles['settings-sidebar-overlay']}
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <div className={`${styles['settings-sidebar']}${isSidebarOpen ? ` ${styles.open}` : ''}`}>
          <div className={styles['settings-sidebar-title']}>
            Settings
            <span className={styles['version-label']}>v{__APP_VERSION__}</span>
          </div>
          <nav className={styles['settings-nav']}>
            <button
              className={`${styles['settings-nav-item']}${category === 'appearance' ? ` ${styles.active}` : ''}`}
              onClick={() => selectCategory('appearance')}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6z" fill="currentColor" opacity=".6" />
              </svg>
              Appearance
            </button>
            <button
              className={`${styles['settings-nav-item']}${category === 'channels' ? ` ${styles.active}` : ''}`}
              onClick={() => selectCategory('channels')}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M2 4h12M2 8h8M2 12h10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Chat Channels
            </button>
            <button
              className={`${styles['settings-nav-item']}${category === 'security' ? ` ${styles.active}` : ''}`}
              onClick={() => selectCategory('security')}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M8 2L3 4.5v4c0 2.5 2 4.5 5 5.5 3-1 5-3 5-5.5v-4L8 2z" />
              </svg>
              Security
            </button>
            <button
              className={`${styles['settings-nav-item']}${category === 'others' ? ` ${styles.active}` : ''}`}
              onClick={() => selectCategory('others')}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="2" y="2" width="12" height="12" rx="2" />
                <path d="M5 8h6M8 5v6" />
              </svg>
              Others
            </button>
          </nav>
        </div>

        <div className={styles['settings-content']}>
          <div className={styles['settings-content-header']}>
            <button
              className={styles['settings-hamburger-btn']}
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              aria-label="Toggle settings categories"
            >
              <span className={`hamburger-icon${isSidebarOpen ? ' open' : ''}`}>
                <span />
                <span />
                <span />
              </span>
            </button>
            <h2>
              {category === 'appearance' && 'Appearance'}
              {category === 'channels' && 'Chat Channels'}
              {category === 'security' && 'Security'}
              {category === 'others' && 'Others'}
            </h2>
            <button className={styles['modal-close']} onClick={handleClose}>
              ×
            </button>
          </div>

          <div className={styles['settings-content-body']} key={category}>
            {category === 'appearance' && (
              <AppearanceSettings
                fontFamily={fontFamily}
                fontSize={fontSize}
                italicizeSystem={italicizeSystem}
                useColoredBackground={useColoredBackground}
                setFontFamily={setFontFamily}
                setFontSize={setFontSize}
                setItalicizeSystem={setItalicizeSystem}
                setUseColoredBackground={setUseColoredBackground}
              />
            )}
            {category === 'channels' && (
              <ChannelSettings
                serverChannels={serverChannels}
                disabledChannels={disabledChannels}
                selectedSendPrefix={selectedSendPrefix}
                setDisabledChannels={setDisabledChannels}
                setSelectedSendPrefix={setSelectedSendPrefix}
              />
            )}
            {category === 'security' && (
              <SecuritySettings
                trustedDomains={trustedDomains}
                setTrustedDomains={setTrustedDomains}
              />
            )}
            {category === 'others' && (
              <OthersSettings
                tellModeAll={tellModeAll}
                setTellModeAll={setTellModeAll}
                ctrlEnterToSend={ctrlEnterToSend}
                setCtrlEnterToSend={setCtrlEnterToSend}
                emoteConfirm={emoteConfirm}
                setEmoteConfirm={setEmoteConfirm}
                emoteSortByName={emoteSortByName}
                setEmoteSortByName={setEmoteSortByName}
                retainSyncSendPrefix={retainSyncSendPrefix}
                setRetainSyncSendPrefix={setRetainSyncSendPrefix}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
