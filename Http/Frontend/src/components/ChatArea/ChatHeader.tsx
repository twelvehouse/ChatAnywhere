import { useState } from 'react';
import clsx from 'clsx';
import { Pencil } from 'lucide-react';
import styles from './ChatHeader.module.css';
import type { CustomFilter } from '../../types/filter';
import type { TellPartner } from '../../types/chat';
import { FilterEditModal } from '../Sidebar/FilterEditModal';
import { useSettingsStore } from '../../store/settingsStore';

interface Props {
  activeDmTarget: TellPartner | null;
  activeFilter: CustomFilter | null;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onEditFilter: (filter: CustomFilter, oldName: string) => void;
}

export function ChatHeader({
  activeDmTarget,
  activeFilter,
  isSidebarOpen,
  onToggleSidebar,
  onEditFilter,
}: Props) {
  const filters = useSettingsStore((s) => s.filters);
  const folders = useSettingsStore((s) => s.folders);
  const [showEditModal, setShowEditModal] = useState(false);

  return (
    <>
      <header className={styles['chat-header']}>
        <button
          className={styles['hamburger-btn']}
          onClick={onToggleSidebar}
          aria-label="Toggle menu"
          aria-expanded={isSidebarOpen}
        >
          <span className={clsx('hamburger-icon', isSidebarOpen && 'open')}>
            <span />
            <span />
            <span />
          </span>
        </button>
        <div className={styles['header-title']}>
          <span className={styles['chat-header-hash']}>{activeDmTarget ? '@' : '#'}</span>
          <span className={styles['chat-header-name']}>
            {activeDmTarget ? activeDmTarget.name : (activeFilter?.name ?? 'chat')}
          </span>
        </div>
        {activeFilter && !activeDmTarget && (
          <button className={styles['header-edit-btn']} onClick={() => setShowEditModal(true)}>
            <Pencil className={styles['header-edit-icon']} size={14} aria-hidden />
            Edit
          </button>
        )}
      </header>

      {showEditModal && activeFilter && (
        <FilterEditModal
          initial={activeFilter}
          existingFilterNames={filters
            .filter((f) => f.name !== activeFilter.name)
            .map((f) => f.name)}
          existingFolderNames={folders.map((f) => f.name)}
          onSave={(updated, oldName) => {
            onEditFilter(updated, oldName);
            setShowEditModal(false);
          }}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </>
  );
}
