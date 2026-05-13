import { useState } from 'react';
import styles from './FiltersSettings.module.css';
import { ImportFiltersModal } from './ImportFiltersModal';
import { ConfirmDialog } from '../Sidebar/ConfirmDialog';
import type { CustomFilter, FilterFolder } from '../../types/filter';
import type { FilterMode } from '../../hooks/useFilterMode';

interface Props {
  currentFilters: CustomFilter[];
  currentFolders: FilterFolder[];
  onImport: (newFilters: CustomFilter[], newFolders: FilterFolder[]) => void;
  filterMode: FilterMode | null;
  onDeletePersonalFilters: (key: string) => Promise<void>;
}

export function FiltersSettings({
  currentFilters,
  currentFolders,
  onImport,
  filterMode,
  onDeletePersonalFilters,
}: Props) {
  const [showImportModal, setShowImportModal] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const personalFilterCharacters = filterMode?.personalFilterCharacters ?? [];

  return (
    <>
      <div className="form-section">
        <div className="form-section-title">IMPORT</div>
        <p className={styles.description}>
          Copy filters and folders from another character&apos;s saved settings into{' '}
          <strong>this character&apos;s settings</strong>.
        </p>
        <button className="btn btn-primary" onClick={() => setShowImportModal(true)}>
          Import Filters
        </button>
      </div>

      <div className="form-section">
        <div className="form-section-title">PERSONAL FILTERS</div>
        {personalFilterCharacters.length === 0 ? (
          <p className={styles.empty}>No characters are using personal filter settings.</p>
        ) : (
          <>
            <p className={styles.description}>
              Characters using their own personal filter settings instead of the shared settings.
            </p>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Character</th>
                  <th className={styles['th-status']}>Status</th>
                  <th className={styles['th-action']} />
                </tr>
              </thead>
              <tbody>
                {personalFilterCharacters.map((key) => {
                  const isCurrent = filterMode?.characterKey === key;
                  return (
                    <tr key={key}>
                      <td className={styles['td-key']}>{key}</td>
                      <td className={styles['td-status']}>
                        {isCurrent ? (
                          <span className={styles['badge-current']}>Current</span>
                        ) : (
                          <span className={styles['badge-personal']}>Personal</span>
                        )}
                      </td>
                      <td className={styles['td-action']}>
                        <button
                          className={`btn btn-secondary ${styles['btn-delete']}`}
                          onClick={() => setPendingDelete(key)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>

      {showImportModal && (
        <ImportFiltersModal
          currentFilters={currentFilters}
          currentFolders={currentFolders}
          onImport={onImport}
          onClose={() => setShowImportModal(false)}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title={`Delete personal filters for "${pendingDelete}"?`}
          body="The personal filter settings for this character will be permanently deleted. This cannot be undone."
          confirmLabel="Delete"
          onConfirm={async () => {
            await onDeletePersonalFilters(pendingDelete);
            setPendingDelete(null);
          }}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </>
  );
}
