import type { Dispatch, SetStateAction } from 'react';
import styles from './SecuritySettings.module.css';
import { saveTrustedDomains } from '../../lib/storageUtils';
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
      saveTrustedDomains(next);
      return next;
    });
  };

  return (
    <div className="form-section">
      <div className={styles['section-header-row']}>
        <div className={styles['section-header-titles']}>
          <span className={styles['section-label']}>SECURITY</span>
          <h3>Trusted Link Domains</h3>
          <p>
            Manage domains that are allowed to open without a confirmation prompt. New domains can
            be added through the link opening dialog.
          </p>
        </div>
      </div>

      <div className={styles['domain-list']}>
        {BUILT_IN_TRUSTED_DOMAINS.map((domain) => (
          <div key={domain} className={`${styles['domain-item']} ${styles['domain-item-builtin']}`}>
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
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
