import { useState, useRef } from 'react';
import clsx from 'clsx';
import { ChevronDown, Check, Lock } from 'lucide-react';
import styles from './ChannelSelect.module.css';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';
import { FALLBACK_CHANNEL } from '../../constants/channels';
import { getBadgeInfoByPrefix, getChannelInfo } from '../../lib/channelUtils';
import { useTheme } from '../../hooks/useTheme';
import type { ChannelOption } from '../../types/chat';

const TELL_BADGE = getChannelInfo(12);

interface Props {
  channels: ChannelOption[];
  value: string;
  onChange: (prefix: string) => void;
  tellMode?: boolean;
  locked?: boolean;
}

export function ChannelSelect({
  channels,
  value,
  onChange,
  tellMode = false,
  locked = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  const current = channels.find((c) => c.prefix === value) ?? channels[0];
  const currentBadge = tellMode
    ? TELL_BADGE
    : current
      ? getBadgeInfoByPrefix(current.prefix)
      : FALLBACK_CHANNEL;
  const currentBadgeColor = theme.channelTextColor(currentBadge);

  useOnClickOutside(ref, () => setOpen(false), open);

  return (
    <div className={styles['ch-select']} ref={ref}>
      <button
        type="button"
        className={clsx(styles['ch-select-trigger'], locked && styles.locked)}
        onClick={locked ? undefined : () => setOpen((o) => !o)}
        tabIndex={locked ? -1 : 0}
        aria-disabled={locked || undefined}
        data-tooltip={locked ? undefined : 'Switch Channel'}
        data-tooltip-pos="top"
        data-picker-open={open ? 'true' : undefined}
      >
        {/* Trigger badge keeps the channel-badge layout/size (so labels of
            different lengths don't shift surrounding elements) but the chip
            frame is hidden so it reads as plain colored text. The transparent
            border preserves the box dimensions defined by the global class. */}
        <span
          className="channel-badge"
          style={{
            ...theme.badgeStyle(currentBadge),
            background: 'transparent',
            borderColor: 'transparent',
          }}
        >
          {currentBadge.label}
        </span>
        {locked ? (
          <Lock
            className={styles['ch-select-chevron']}
            size={11}
            strokeWidth={2}
            color={currentBadgeColor}
            aria-hidden
          />
        ) : (
          <ChevronDown
            className={clsx(styles['ch-select-chevron'], open && styles.open)}
            size={12}
            strokeWidth={1.5}
            color={currentBadgeColor}
            aria-hidden
          />
        )}
      </button>

      {open && !locked && (
        <div className={styles['ch-select-menu']}>
          {channels.map((ch) => {
            const badge = getBadgeInfoByPrefix(ch.prefix);
            const badgeColor = theme.channelTextColor(badge);
            const active = ch.prefix === value;
            return (
              <button
                key={ch.prefix}
                type="button"
                className={clsx(styles['ch-select-item'], active && styles.active)}
                style={{
                  color: badgeColor,
                  background: active ? theme.channelSelectActiveBg(badge) : undefined,
                }}
                onClick={() => {
                  onChange(ch.prefix);
                  setOpen(false);
                }}
              >
                <span className={styles['ch-select-item-badge']} style={{ color: badgeColor }}>
                  {badge.label}
                </span>
                <span className={styles['ch-select-item-label']}>{ch.label}</span>
                {active && (
                  <Check
                    className={styles['ch-select-check']}
                    size={12}
                    strokeWidth={1.8}
                    color={badgeColor}
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
