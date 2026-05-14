import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import styles from './SettingsModal.module.css';
import { AppearanceSettings } from './AppearanceSettings';
import { ChannelSettings } from './ChannelSettings';
import { FiltersSettings } from './FiltersSettings';
import { OthersSettings } from './OthersSettings';
import { SecuritySettings } from './SecuritySettings';
import type { ChannelOption } from '../../types/chat';
import type { CustomFilter, FilterFolder } from '../../types/filter';
import type { FilterMode } from '../../hooks/useFilterMode';

type SettingsCategory = 'appearance' | 'send-channels' | 'filters' | 'chat-input' | 'security';

interface Props {
  // Appearance
  fontFamily: string;
  fontSize: number;
  italicizeSystem: boolean;
  useColoredBackground: boolean;
  largeLinkPreviews: boolean;
  setFontFamily: Dispatch<SetStateAction<string>>;
  setFontSize: Dispatch<SetStateAction<number>>;
  setItalicizeSystem: Dispatch<SetStateAction<boolean>>;
  setUseColoredBackground: Dispatch<SetStateAction<boolean>>;
  setLargeLinkPreviews: Dispatch<SetStateAction<boolean>>;
  // Send Channels
  serverChannels: ChannelOption[];
  disabledChannels: Set<string>;
  selectedSendPrefix: string;
  setDisabledChannels: Dispatch<SetStateAction<Set<string>>>;
  setSelectedSendPrefix: Dispatch<SetStateAction<string>>;
  // Security
  trustedDomains: Set<string>;
  setTrustedDomains: Dispatch<SetStateAction<Set<string>>>;
  // Chat & Input
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
  // Filters
  currentFilters: CustomFilter[];
  currentFolders: FilterFolder[];
  onImportFilters: (newFilters: CustomFilter[], newFolders: FilterFolder[]) => void;
  filterMode: FilterMode | null;
  onDeletePersonalFilters: (key: string) => Promise<void>;
  // Control
  onClose: () => void;
}

export function SettingsModal({
  fontFamily,
  fontSize,
  italicizeSystem,
  useColoredBackground,
  largeLinkPreviews,
  setFontFamily,
  setFontSize,
  setItalicizeSystem,
  setUseColoredBackground,
  setLargeLinkPreviews,
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
  currentFilters,
  currentFolders,
  onImportFilters,
  filterMode,
  onDeletePersonalFilters,
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
              className={`${styles['settings-nav-item']}${category === 'chat-input' ? ` ${styles.active}` : ''}`}
              onClick={() => selectCategory('chat-input')}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  d="M2 3h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H5l-3 2V4a1 1 0 0 1 1-1z"
                  strokeLinejoin="round"
                />
              </svg>
              Chat &amp; Input
            </button>
            <button
              className={`${styles['settings-nav-item']}${category === 'send-channels' ? ` ${styles.active}` : ''}`}
              onClick={() => selectCategory('send-channels')}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M2 4h12M2 8h8M2 12h10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Send Channels
            </button>
            <button
              className={`${styles['settings-nav-item']}${category === 'filters' ? ` ${styles.active}` : ''}`}
              onClick={() => selectCategory('filters')}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M2 3h12l-4.5 5.5V13l-3-1.5V8.5L2 3z" strokeLinejoin="round" />
              </svg>
              Filters
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
              {category === 'send-channels' && 'Send Channels'}
              {category === 'filters' && 'Filters'}
              {category === 'chat-input' && 'Chat & Input'}
              {category === 'security' && 'Security'}
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
                largeLinkPreviews={largeLinkPreviews}
                setFontFamily={setFontFamily}
                setFontSize={setFontSize}
                setItalicizeSystem={setItalicizeSystem}
                setUseColoredBackground={setUseColoredBackground}
                setLargeLinkPreviews={setLargeLinkPreviews}
              />
            )}
            {category === 'send-channels' && (
              <ChannelSettings
                serverChannels={serverChannels}
                disabledChannels={disabledChannels}
                selectedSendPrefix={selectedSendPrefix}
                setDisabledChannels={setDisabledChannels}
                setSelectedSendPrefix={setSelectedSendPrefix}
              />
            )}
            {category === 'filters' && (
              <FiltersSettings
                currentFilters={currentFilters}
                currentFolders={currentFolders}
                onImport={onImportFilters}
                filterMode={filterMode}
                onDeletePersonalFilters={onDeletePersonalFilters}
              />
            )}
            {category === 'chat-input' && (
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
            {category === 'security' && (
              <SecuritySettings
                trustedDomains={trustedDomains}
                setTrustedDomains={setTrustedDomains}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
