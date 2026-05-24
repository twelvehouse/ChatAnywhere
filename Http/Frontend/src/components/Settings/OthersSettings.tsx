import clsx from 'clsx';
import { useSettingsStore } from '../../store/settingsStore';
import styles from './OthersSettings.module.css';

export function OthersSettings() {
  const tellModeAll = useSettingsStore((s) => s.tellModeAll);
  const ctrlEnterToSend = useSettingsStore((s) => s.ctrlEnterToSend);
  const emoteConfirm = useSettingsStore((s) => s.emoteConfirm);
  const emoteSortByName = useSettingsStore((s) => s.emoteSortByName);
  const retainSyncSendPrefix = useSettingsStore((s) => s.retainSyncSendPrefix);
  const sendDelayEnabled = useSettingsStore((s) => s.sendDelayEnabled);
  const sendDelaySeconds = useSettingsStore((s) => s.sendDelaySeconds);
  const sendDelayAlwaysQueue = useSettingsStore((s) => s.sendDelayAlwaysQueue);
  const setTellModeAll = useSettingsStore((s) => s.setTellModeAll);
  const setCtrlEnterToSend = useSettingsStore((s) => s.setCtrlEnterToSend);
  const setEmoteConfirm = useSettingsStore((s) => s.setEmoteConfirm);
  const setEmoteSortByName = useSettingsStore((s) => s.setEmoteSortByName);
  const setRetainSyncSendPrefix = useSettingsStore((s) => s.setRetainSyncSendPrefix);
  const setSendDelayEnabled = useSettingsStore((s) => s.setSendDelayEnabled);
  const setSendDelaySeconds = useSettingsStore((s) => s.setSendDelaySeconds);
  const setSendDelayAlwaysQueue = useSettingsStore((s) => s.setSendDelayAlwaysQueue);
  return (
    <>
      <div className="form-section">
        <div className="form-section-title">MESSAGE</div>
        <div
          className={clsx('form-row', styles['clickable-row'])}
          onClick={() => setTellModeAll(!tellModeAll)}
        >
          <span className="form-row-label">Enable Tell mode for all messages</span>
          <div className={clsx('toggle-switch', tellModeAll && 'on')}>
            <div className="toggle-knob" />
          </div>
        </div>
        <div
          className={clsx('form-row', styles['clickable-row'])}
          onClick={() => setCtrlEnterToSend(!ctrlEnterToSend)}
        >
          <span className="form-row-label">Send message with Ctrl+Enter only</span>
          <div className={clsx('toggle-switch', ctrlEnterToSend && 'on')}>
            <div className="toggle-knob" />
          </div>
        </div>
        <div
          className={clsx('form-row', styles['clickable-row'])}
          onClick={() => setSendDelayEnabled(!sendDelayEnabled)}
        >
          <span className="form-row-label">
            Queue messages before sending (tap input to cancel)
          </span>
          <div className={clsx('toggle-switch', sendDelayEnabled && 'on')}>
            <div className="toggle-knob" />
          </div>
        </div>
        {!sendDelayAlwaysQueue && (
          <div className={clsx(styles['sub-note'], !sendDelayEnabled && styles.dimmed)}>
            Ctrl+Enter and the Send button send immediately, without queueing.
          </div>
        )}
        <div className={clsx('form-row', styles['indented-row'])}>
          <span className={clsx('form-row-label', !sendDelayEnabled && styles.dimmed)}>
            Queue duration
          </span>
          <div className={styles['slider-container']}>
            <span
              className={clsx(
                'form-row-label',
                styles['muted-value'],
                !sendDelayEnabled && styles.dimmed,
              )}
            >
              {sendDelaySeconds}s
            </span>
            <input
              type="range"
              className={styles['settings-range']}
              min="1"
              max="10"
              step="1"
              value={sendDelaySeconds}
              onChange={(e) => setSendDelaySeconds(Number(e.target.value))}
              disabled={!sendDelayEnabled}
            />
          </div>
        </div>
        <div
          className={clsx(
            'form-row',
            styles['indented-row'],
            sendDelayEnabled && styles['clickable-row'],
          )}
          onClick={() => sendDelayEnabled && setSendDelayAlwaysQueue(!sendDelayAlwaysQueue)}
        >
          <span className={clsx('form-row-label', !sendDelayEnabled && styles.dimmed)}>
            Always queue
          </span>
          <div
            className={clsx(
              'toggle-switch',
              sendDelayAlwaysQueue && 'on',
              !sendDelayEnabled && styles.dimmed,
            )}
          >
            <div className="toggle-knob" />
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">EMOTE</div>
        <div
          className={clsx('form-row', styles['clickable-row'])}
          onClick={() => setEmoteConfirm(!emoteConfirm)}
        >
          <span className="form-row-label">Confirm before executing emote</span>
          <div className={clsx('toggle-switch', emoteConfirm && 'on')}>
            <div className="toggle-knob" />
          </div>
        </div>
        <div
          className={clsx('form-row', styles['clickable-row'])}
          onClick={() => setEmoteSortByName(!emoteSortByName)}
        >
          <span className="form-row-label">Sort emotes by name</span>
          <div className={clsx('toggle-switch', emoteSortByName && 'on')}>
            <div className="toggle-knob" />
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">SEND DESTINATION</div>
        <div
          className={clsx('form-row', styles['clickable-row'])}
          onClick={() => setRetainSyncSendPrefix(!retainSyncSendPrefix)}
        >
          <span className="form-row-label">
            Retain send destination when returning to a Sync tab
          </span>
          <div className={clsx('toggle-switch', retainSyncSendPrefix && 'on')}>
            <div className="toggle-knob" />
          </div>
        </div>
      </div>
    </>
  );
}
