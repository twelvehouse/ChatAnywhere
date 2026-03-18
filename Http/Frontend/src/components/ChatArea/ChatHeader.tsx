import { useState } from 'react';
import styles from './ChatHeader.module.css';
import type { CustomFilter, FilterFolder } from '../../types/filter';
import { FilterEditModal } from '../Sidebar/FilterEditModal';

interface Props {
  activeFilter: CustomFilter | null;
  filters: CustomFilter[];
  folders: FilterFolder[];
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onEditFilter: (filter: CustomFilter, oldName: string) => void;
}

export function ChatHeader({
  activeFilter,
  filters,
  folders,
  isSidebarOpen,
  onToggleSidebar,
  onEditFilter,
}: Props) {
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
          <span className={`hamburger-icon${isSidebarOpen ? ' open' : ''}`}>
            <span />
            <span />
            <span />
          </span>
        </button>
        <div className={styles['header-title']}>
          <span className={styles['chat-header-hash']}>#</span>
          <span className={styles['chat-header-name']}>{activeFilter?.name ?? 'chat'}</span>
        </div>
        {activeFilter && (
          <button className={styles['header-edit-btn']} onClick={() => setShowEditModal(true)}>
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
