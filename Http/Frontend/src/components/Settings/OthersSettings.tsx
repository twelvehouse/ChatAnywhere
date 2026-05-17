import clsx from 'clsx';
import { useSettingsStore } from '../../store/settingsStore';

export function OthersSettings() {
  const tellModeAll = useSettingsStore((s) => s.tellModeAll);
  const ctrlEnterToSend = useSettingsStore((s) => s.ctrlEnterToSend);
  const emoteConfirm = useSettingsStore((s) => s.emoteConfirm);
  const emoteSortByName = useSettingsStore((s) => s.emoteSortByName);
  const retainSyncSendPrefix = useSettingsStore((s) => s.retainSyncSendPrefix);
  const setTellModeAll = useSettingsStore((s) => s.setTellModeAll);
  const setCtrlEnterToSend = useSettingsStore((s) => s.setCtrlEnterToSend);
  const setEmoteConfirm = useSettingsStore((s) => s.setEmoteConfirm);
  const setEmoteSortByName = useSettingsStore((s) => s.setEmoteSortByName);
  const setRetainSyncSendPrefix = useSettingsStore((s) => s.setRetainSyncSendPrefix);
  return (
    <>
      <div className="form-section">
        <div className="form-section-title">MESSAGE</div>
        <div
          className="form-row"
          style={{ cursor: 'pointer' }}
          onClick={() => setTellModeAll(!tellModeAll)}
        >
          <span className="form-row-label">Enable Tell mode for all messages</span>
          <div className={clsx('toggle-switch', tellModeAll && 'on')}>
            <div className="toggle-knob" />
          </div>
        </div>
        <div
          className="form-row"
          style={{ cursor: 'pointer' }}
          onClick={() => setCtrlEnterToSend(!ctrlEnterToSend)}
        >
          <span className="form-row-label">Send message with Ctrl+Enter only</span>
          <div className={clsx('toggle-switch', ctrlEnterToSend && 'on')}>
            <div className="toggle-knob" />
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">EMOTE</div>
        <div
          className="form-row"
          style={{ cursor: 'pointer' }}
          onClick={() => setEmoteConfirm(!emoteConfirm)}
        >
          <span className="form-row-label">Confirm before executing emote</span>
          <div className={clsx('toggle-switch', emoteConfirm && 'on')}>
            <div className="toggle-knob" />
          </div>
        </div>
        <div
          className="form-row"
          style={{ cursor: 'pointer' }}
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
          className="form-row"
          style={{ cursor: 'pointer' }}
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
