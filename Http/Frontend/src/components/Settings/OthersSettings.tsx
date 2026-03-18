import type { Dispatch, SetStateAction } from 'react';

interface Props {
  tellModeAll: boolean;
  setTellModeAll: Dispatch<SetStateAction<boolean>>;
}

export function OthersSettings({ tellModeAll, setTellModeAll }: Props) {
  return (
    <div className="settings-section">
      <div
        className="settings-inline-row"
        style={{ cursor: 'pointer' }}
        onClick={() => setTellModeAll((v) => !v)}
      >
        <span className="settings-inline-label">Enable Tell mode for all messages</span>
        <div className={`toggle-switch${tellModeAll ? ' on' : ''}`}>
          <div className="toggle-knob" />
        </div>
      </div>
    </div>
  );
}
