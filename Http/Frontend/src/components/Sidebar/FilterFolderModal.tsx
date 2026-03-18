import { useState } from 'react';
import styles from './FilterFolderModal.module.css';
import { FILTER_NAME_REGEX, FILTER_NAME_ERROR } from '../../types/filter';

interface Props {
  initialName?: string;
  existingNames: string[]; // existing folder names, excluding this folder
  onSave: (name: string) => void;
  onClose: () => void;
}

export function FilterFolderModal({ initialName = '', existingNames, onSave, onClose }: Props) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState('');

  const validate = (value: string): string => {
    if (!FILTER_NAME_REGEX.test(value)) return FILTER_NAME_ERROR;
    if (existingNames.includes(value)) return 'This name is already in use.';
    return '';
  };

  const handleSave = () => {
    const err = validate(name);
    if (err) {
      setError(err);
      return;
    }
    onSave(name);
  };

  const isEdit = initialName !== '';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>{isEdit ? 'Rename Folder' : 'New Folder'}</h2>

        <label className={styles.label}>
          Folder Name
          <input
            className={`${styles.input}${error ? ` ${styles['input-error']}` : ''}`}
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') onClose();
            }}
            autoFocus
            maxLength={32}
            placeholder="e.g. MyFolder"
          />
          {error && <span className={styles.error}>{error}</span>}
          {!error && (
            <span className={styles.hint}>Letters, numbers, hyphens, underscores (max 32)</span>
          )}
        </label>

        <div className={styles.actions}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            {isEdit ? 'Rename' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
