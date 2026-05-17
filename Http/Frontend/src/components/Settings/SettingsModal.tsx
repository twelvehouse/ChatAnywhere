import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import clsx from 'clsx';
import { Palette, MessageSquare, AlignLeft, Filter as FilterIcon, Shield } from 'lucide-react';
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

        <div className={clsx(styles['settings-sidebar'], isSidebarOpen && styles.open)}>
          <div className={styles['settings-sidebar-title']}>
            Settings
            <span className={styles['version-label']}>v{__APP_VERSION__}</span>
          </div>
          <nav className={styles['settings-nav']}>
            <button
              className={clsx(
                styles['settings-nav-item'],
                category === 'appearance' && styles.active,
              )}
              onClick={() => selectCategory('appearance')}
            >
              <Palette size={16} strokeWidth={1.5} aria-hidden />
              Appearance
            </button>
            <button
              className={clsx(
                styles['settings-nav-item'],
                category === 'chat-input' && styles.active,
              )}
              onClick={() => selectCategory('chat-input')}
            >
              <MessageSquare size={16} strokeWidth={1.5} aria-hidden />
              Chat &amp; Input
            </button>
            <button
              className={clsx(
                styles['settings-nav-item'],
                category === 'send-channels' && styles.active,
              )}
              onClick={() => selectCategory('send-channels')}
            >
              <AlignLeft size={16} strokeWidth={1.5} aria-hidden />
              Send Channels
            </button>
            <button
              className={clsx(styles['settings-nav-item'], category === 'filters' && styles.active)}
              onClick={() => selectCategory('filters')}
            >
              <FilterIcon size={16} strokeWidth={1.5} aria-hidden />
              Filters
            </button>
            <button
              className={clsx(
                styles['settings-nav-item'],
                category === 'security' && styles.active,
              )}
              onClick={() => selectCategory('security')}
            >
              <Shield size={16} strokeWidth={1.5} aria-hidden />
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
              <span className={clsx('hamburger-icon', isSidebarOpen && 'open')}>
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
