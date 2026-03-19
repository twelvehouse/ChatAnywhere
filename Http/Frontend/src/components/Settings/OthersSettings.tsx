import type { Dispatch, SetStateAction } from 'react';

interface Props {
  tellModeAll: boolean;
  setTellModeAll: Dispatch<SetStateAction<boolean>>;
  ctrlEnterToSend: boolean;
  setCtrlEnterToSend: Dispatch<SetStateAction<boolean>>;
}

export function OthersSettings({
  tellModeAll,
  setTellModeAll,
  ctrlEnterToSend,
  setCtrlEnterToSend,
}: Props) {
  return (
    <div className="form-section">
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
  );
}
