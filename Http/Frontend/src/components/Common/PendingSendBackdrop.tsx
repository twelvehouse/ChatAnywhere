import { usePendingSendStore } from '../../store/pendingSendStore';
import styles from './PendingSendBackdrop.module.css';

/**
 * Full-screen click-catcher rendered while a send is queued. Sits below the
 * input area (which has its own click-to-cancel overlay) so the rest of the
 * UI is non-interactive — clicking anywhere on the backdrop runs the same
 * cancel handler the input overlay does.
 */
export function PendingSendBackdrop() {
  const cancelHandler = usePendingSendStore((s) => s.cancelHandler);
  if (!cancelHandler) return null;
  // Hidden from AT — banner button + Enter/Escape are the announced cancel affordances.
  return (
    <button
      type="button"
      className={styles.backdrop}
      onClick={cancelHandler}
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}
