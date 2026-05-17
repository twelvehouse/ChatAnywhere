import type { Dispatch, SetStateAction } from 'react';
import clsx from 'clsx';
import styles from './ChannelSettings.module.css';
import { ALL_CHANNELS } from '../../constants/channels';
import { getBadgeInfoByPrefix, getBadgeStyle } from '../../lib/channelUtils';
import type { ChannelOption } from '../../types/chat';
import { useSettingsStore } from '../../store/settingsStore';

interface Props {
  serverChannels: ChannelOption[];
  selectedSendPrefix: string;
  setSelectedSendPrefix: Dispatch<SetStateAction<string>>;
}

export function ChannelSettings({
  serverChannels,
  selectedSendPrefix,
  setSelectedSendPrefix,
}: Props) {
  const disabledChannels = useSettingsStore((s) => s.disabledChannels);
  const setDisabledChannels = useSettingsStore((s) => s.setDisabledChannels);

  const mergedChannels: ChannelOption[] = [
    ...ALL_CHANNELS,
    ...serverChannels.filter((sc) => !ALL_CHANNELS.some((ac) => ac.prefix === sc.prefix)),
  ];

  const toggleChannel = (prefix: string) => {
    const next = new Set(disabledChannels);
    if (next.has(prefix)) {
      next.delete(prefix);
    } else {
      next.add(prefix);
    }
    if (next.has(selectedSendPrefix)) {
      const first = mergedChannels.find((c) => !next.has(c.prefix));
      if (first) setSelectedSendPrefix(first.prefix);
    }
    setDisabledChannels(next);
  };

  return (
    <>
      <div className="form-section">
        <div className="form-section-title">SEND CHANNEL VISIBILITY</div>
        <p>
          Choose which channels appear in the send dropdown. Hiding unused channels helps prevent
          accidental sends.
        </p>
      </div>
      <div className={styles['ch-toggle-list']}>
        {mergedChannels.map((ch) => {
          const badge = getBadgeInfoByPrefix(ch.prefix);
          const enabled = !disabledChannels.has(ch.prefix);
          return (
            <div
              key={ch.prefix}
              className={styles['ch-toggle-row']}
              onClick={() => toggleChannel(ch.prefix)}
            >
              <span className="channel-badge" style={getBadgeStyle(badge)}>
                {badge.label}
              </span>
              <span className={styles['ch-toggle-label']}>{ch.label}</span>
              <div className={clsx('toggle-switch', enabled && 'on')}>
                <div className="toggle-knob" />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
