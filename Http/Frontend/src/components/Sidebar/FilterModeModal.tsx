import { useState } from 'react';
import styles from './FilterModeModal.module.css';
import type { FilterMode } from '../../hooks/useFilterMode';

interface Props {
  filterMode: FilterMode;
  onEnable: (copyFromGlobal: boolean) => Promise<void>;
  onDisable: () => Promise<void>;
  onClose: () => void;
}

export function FilterModeModal({ filterMode, onEnable, onDisable, onClose }: Props) {
  const [overwrite, setOverwrite] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleEnable = async () => {
    setBusy(true);
    try {
      const copyFromGlobal = !filterMode.hasExistingFile || overwrite;
      await onEnable(copyFromGlobal);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    setBusy(true);
    try {
      await onDisable();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  if (filterMode.isPersonal) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
          <p className={styles.title}>Switch to shared filters?</p>
          <p className={styles.body}>
            This character will use the shared filter settings. The personal settings will be kept
            but not used.
          </p>
          <div className={styles.actions}>
            <button className="btn btn-secondary" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleDisable} disabled={busy}>
              {busy ? 'Switching…' : 'Use Shared Filters'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <p className={styles.title}>Switch to personal filters?</p>
        <p className={styles.body}>
          {filterMode.hasExistingFile
            ? 'This character will use its own personal filter settings, separate from the shared filters.'
            : 'This character will use its own personal filter settings. The current shared filters will be copied as a starting point.'}
        </p>

        {filterMode.hasExistingFile && (
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
            />
            <span className={styles['toggle-label']}>Overwrite with current shared filters</span>
          </label>
        )}

        <div className={styles.actions}>
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleEnable} disabled={busy}>
            {busy ? 'Switching…' : 'Use Personal Filters'}
          </button>
        </div>
      </div>
    </div>
  );
}
