import { useState } from 'react';
import { ImportFiltersModal } from './ImportFiltersModal';
import type { CustomFilter, FilterFolder } from '../../types/filter';

interface Props {
  currentFilters: CustomFilter[];
  currentFolders: FilterFolder[];
  onImport: (newFilters: CustomFilter[], newFolders: FilterFolder[]) => void;
}

export function FiltersSettings({ currentFilters, currentFolders, onImport }: Props) {
  const [showImportModal, setShowImportModal] = useState(false);

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

      {showImportModal && (
        <ImportFiltersModal
          currentFilters={currentFilters}
          currentFolders={currentFolders}
          onImport={onImport}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </>
  );
}
