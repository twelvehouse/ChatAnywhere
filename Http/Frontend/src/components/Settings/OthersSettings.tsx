import type { Dispatch, SetStateAction } from 'react';

interface Props {
  tellModeAll: boolean;
  setTellModeAll: Dispatch<SetStateAction<boolean>>;
  ctrlEnterToSend: boolean;
  setCtrlEnterToSend: Dispatch<SetStateAction<boolean>>;
  emoteConfirm: boolean;
  setEmoteConfirm: Dispatch<SetStateAction<boolean>>;
  retainSyncSendPrefix: boolean;
  setRetainSyncSendPrefix: Dispatch<SetStateAction<boolean>>;
}

export function OthersSettings({
  tellModeAll,
  setTellModeAll,
  ctrlEnterToSend,
  setCtrlEnterToSend,
  emoteConfirm,
  setEmoteConfirm,
  retainSyncSendPrefix,
  setRetainSyncSendPrefix,
}: Props) {
  return (
    <>
      <div className="form-section">
        <div className="form-section-title">MESSAGE</div>
        <div
          className="form-row"
          style={{ cursor: 'pointer' }}
          onClick={() => setTellModeAll((v) => !v)}
        >
          <span className="form-row-label">Enable Tell mode for all messages</span>
          <div className={`toggle-switch${tellModeAll ? ' on' : ''}`}>
            <div className="toggle-knob" />
          </div>
        </div>
        <div
          className="form-row"
          style={{ cursor: 'pointer' }}
          onClick={() => setCtrlEnterToSend((v) => !v)}
        >
          <span className="form-row-label">Send message with Ctrl+Enter only</span>
          <div className={`toggle-switch${ctrlEnterToSend ? ' on' : ''}`}>
            <div className="toggle-knob" />
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">EMOTE</div>
        <div
          className="form-row"
          style={{ cursor: 'pointer' }}
          onClick={() => setEmoteConfirm((v) => !v)}
        >
          <span className="form-row-label">Confirm before executing emote</span>
          <div className={`toggle-switch${emoteConfirm ? ' on' : ''}`}>
            <div className="toggle-knob" />
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">SEND DESTINATION</div>
        <div
          className="form-row"
          style={{ cursor: 'pointer' }}
          onClick={() => setRetainSyncSendPrefix((v) => !v)}
        >
          <span className="form-row-label">
            Retain send destination when returning to a Sync tab
          </span>
          <div className={`toggle-switch${retainSyncSendPrefix ? ' on' : ''}`}>
            <div className="toggle-knob" />
          </div>
        </div>
      </div>
    </>
  );
}
