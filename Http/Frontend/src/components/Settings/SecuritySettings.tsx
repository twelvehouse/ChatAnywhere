import type { Dispatch, SetStateAction } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import styles from './SecuritySettings.module.css';
import { BUILT_IN_TRUSTED_DOMAINS } from '../../constants/trustedDomains';

interface Props {
  trustedDomains: Set<string>;
  setTrustedDomains: Dispatch<SetStateAction<Set<string>>>;
}

export function SecuritySettings({ trustedDomains, setTrustedDomains }: Props) {
  const handleRemoveDomain = (domain: string) => {
    setTrustedDomains((prev) => {
      const next = new Set(prev);
      next.delete(domain);
      return next;
    });
  };

  return (
    <div className="form-section">
      <div className="form-section-title">TRUSTED LINK DOMAINS</div>
      <p>
        Manage domains that are allowed to open without a confirmation prompt. New domains can be
        added through the link opening dialog.
      </p>

      <div className={styles['domain-list']}>
        {Array.from(BUILT_IN_TRUSTED_DOMAINS).map((domain) => (
          <div key={domain} className={clsx(styles['domain-item'], styles['domain-item-builtin'])}>
            <span className={styles['domain-name']}>{domain}</span>
            <span className={styles['builtin-badge']}>built-in</span>
          </div>
        ))}
        {trustedDomains.size === 0 && (
          <div className={styles['empty-state']}>No custom domains yet.</div>
        )}
        {Array.from(trustedDomains).map((domain) => (
          <div key={domain} className={styles['domain-item']}>
            <span className={styles['domain-name']}>{domain}</span>
            <button
              className={styles['remove-domain-btn']}
              onClick={() => handleRemoveDomain(domain)}
              aria-label="Remove"
            >
              <X size={14} strokeWidth={2.5} aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
