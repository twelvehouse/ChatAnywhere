import { useState, useRef } from 'react';
import styles from './ChannelSelect.module.css';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';
import { FALLBACK_CHANNEL } from '../../constants/channels';
import { getBadgeInfoByPrefix, getBadgeStyle, getChannelInfo } from '../../lib/channelUtils';
import type { ChannelOption } from '../../types/chat';

const TELL_BADGE = getChannelInfo(12);

interface Props {
  channels: ChannelOption[];
  value: string;
  onChange: (prefix: string) => void;
  tellMode?: boolean;
}

export function ChannelSelect({ channels, value, onChange, tellMode = false }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = channels.find((c) => c.prefix === value) ?? channels[0];
  const currentBadge = tellMode
    ? TELL_BADGE
    : current
      ? getBadgeInfoByPrefix(current.prefix)
      : FALLBACK_CHANNEL;

  useOnClickOutside(ref, () => setOpen(false), open);

  return (
    <div className={styles['ch-select']} ref={ref}>
      <button
        type="button"
        className={styles['ch-select-trigger']}
        onClick={() => setOpen((o) => !o)}
        tabIndex={0}
        data-tooltip="Switch Channel"
        data-tooltip-pos="top"
        data-picker-open={open ? 'true' : undefined}
      >
        <span className="channel-badge" style={getBadgeStyle(currentBadge)}>
          {currentBadge.label}
        </span>
        <svg
          className={`${styles['ch-select-chevron']}${open ? ` ${styles.open}` : ''}`}
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M1 1L5 5L9 1"
            stroke={currentBadge.color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className={styles['ch-select-menu']}>
          {channels.map((ch) => {
            const badge = getBadgeInfoByPrefix(ch.prefix);
            const active = ch.prefix === value;
            return (
              <button
                key={ch.prefix}
                type="button"
                className={`${styles['ch-select-item']}${active ? ` ${styles.active}` : ''}`}
                style={{
                  color: badge.color,
                  background: active ? `${badge.color}22` : undefined,
                }}
                onClick={() => {
                  onChange(ch.prefix);
                  setOpen(false);
                }}
              >
                <span className={styles['ch-select-item-badge']} style={{ color: badge.color }}>
                  {badge.label}
                </span>
                <span className={styles['ch-select-item-label']}>{ch.label}</span>
                {active && (
                  <svg
                    className={styles['ch-select-check']}
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                  >
                    <path
                      d="M2 6L5 9L10 3"
                      stroke={badge.color}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
