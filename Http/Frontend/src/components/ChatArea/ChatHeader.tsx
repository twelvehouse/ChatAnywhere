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
            <svg
              className={styles['header-edit-icon']}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064Zm1.238-3.763a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354Z" />
            </svg>
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
