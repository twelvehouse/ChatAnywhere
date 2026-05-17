import { useState, useRef } from 'react';
import clsx from 'clsx';
import { ChevronDown, Check } from 'lucide-react';
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
        <ChevronDown
          className={clsx(styles['ch-select-chevron'], open && styles.open)}
          size={12}
          strokeWidth={1.5}
          color={currentBadge.color}
          aria-hidden
        />
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
                className={clsx(styles['ch-select-item'], active && styles.active)}
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
                  <Check
                    className={styles['ch-select-check']}
                    size={12}
                    strokeWidth={1.8}
                    color={badge.color}
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
