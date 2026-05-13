import { useState } from 'react';
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
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 12px' }}>
          Copy filters and folders from another character&apos;s saved settings into{' '}
          <strong style={{ color: 'var(--text-secondary)' }}>this character&apos;s settings</strong>
          .
        </p>
        <button className="btn btn-primary" onClick={() => setShowImportModal(true)}>
          Import Filters
        </button>
      </div>

      <div className="form-section">
        <div className="form-section-title">PERSONAL FILTERS</div>
        {personalFilterCharacters.length === 0 ? (
          <p
            style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontStyle: 'italic', margin: 0 }}
          >
            No characters are using personal filter settings.
          </p>
        ) : (
          <>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 12px' }}>
              Characters using their own personal filter settings instead of the shared settings.
            </p>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.85rem',
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '4px 8px 8px 0',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    Character
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '4px 8px 8px',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      borderBottom: '1px solid var(--border)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Status
                  </th>
                  <th style={{ borderBottom: '1px solid var(--border)' }} />
                </tr>
              </thead>
              <tbody>
                {personalFilterCharacters.map((key) => {
                  const isCurrent = filterMode?.characterKey === key;
                  return (
                    <tr key={key}>
                      <td
                        style={{
                          padding: '8px 8px 8px 0',
                          color: 'var(--text-secondary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '180px',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        {key}
                      </td>
                      <td
                        style={{
                          padding: '8px',
                          whiteSpace: 'nowrap',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        {isCurrent ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '1px 7px',
                              borderRadius: '10px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: 'var(--accent)',
                              background: 'color-mix(in oklch, var(--accent) 12%, transparent)',
                              border: '1px solid var(--accent)',
                            }}
                          >
                            Current
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Personal
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: '8px 0 8px 8px',
                          textAlign: 'right',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        <button
                          className="btn btn-secondary"
                          style={{
                            fontSize: '0.78rem',
                            padding: '3px 10px',
                            color: 'var(--offline)',
                          }}
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
