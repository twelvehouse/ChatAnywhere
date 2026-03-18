import styles from './ConfirmDialog.module.css';

interface Props {
  title: string;
  body: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({ title, body, confirmLabel = 'Delete', onConfirm, onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <p className={styles.title}>{title}</p>
        <p className={styles.body}>{body}</p>
        <div className={styles.actions}>
          <button className={`btn btn-secondary ${styles['btn-cancel']}`} onClick={onClose}>
            Cancel
          </button>
          <button className={`btn ${styles['btn-danger']}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
