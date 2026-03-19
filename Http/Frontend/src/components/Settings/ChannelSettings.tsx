import type { Dispatch, SetStateAction } from 'react';
import styles from './ChannelSettings.module.css';
import { ALL_CHANNELS } from '../../constants/channels';
import { getBadgeInfoByPrefix } from '../../lib/channelUtils';
import { saveDisabledChannels } from '../../lib/storageUtils';
import type { ChannelOption } from '../../types/chat';

interface Props {
  serverChannels: ChannelOption[];
  disabledChannels: Set<string>;
  selectedSendPrefix: string;
  setDisabledChannels: Dispatch<SetStateAction<Set<string>>>;
  setSelectedSendPrefix: Dispatch<SetStateAction<string>>;
}

export function ChannelSettings({
  serverChannels,
  disabledChannels,
  selectedSendPrefix,
  setDisabledChannels,
  setSelectedSendPrefix,
}: Props) {
  const mergedChannels: ChannelOption[] = [
    ...ALL_CHANNELS,
    ...serverChannels.filter((sc) => !ALL_CHANNELS.some((ac) => ac.prefix === sc.prefix)),
  ];

  const toggleChannel = (prefix: string) => {
    setDisabledChannels((prev) => {
      const next = new Set(prev);
      if (next.has(prefix)) {
        next.delete(prefix);
      } else {
        next.add(prefix);
      }
      saveDisabledChannels(next);
      if (next.has(selectedSendPrefix)) {
        const first = mergedChannels.find((c) => !next.has(c.prefix));
        if (first) setSelectedSendPrefix(first.prefix);
      }
      return next;
    });
  };

  return (
    <>
      <div className="form-section">
        <h3>Send Channel Visibility</h3>
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
              <span
                className="channel-badge"
                style={{
                  color: badge.color,
                  borderColor: `${badge.color}66`,
                  background: `${badge.color}18`,
                }}
              >
                {badge.label}
              </span>
              <span className={styles['ch-toggle-label']}>{ch.label}</span>
              <div className={`toggle-switch${enabled ? ' on' : ''}`}>
                <div className="toggle-knob" />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
