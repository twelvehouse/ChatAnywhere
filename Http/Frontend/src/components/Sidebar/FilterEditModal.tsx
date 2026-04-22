import { useState } from 'react';
import styles from './FilterEditModal.module.css';
import type { CustomFilter } from '../../types/filter';
import { FILTER_NAME_REGEX, FILTER_NAME_ERROR } from '../../types/filter';
import { TRACKED_CHANNEL_TYPES, ALL_CHANNELS, CHANNEL_GROUPS } from '../../constants/channels';

// Channel type labels for the modal checkboxes (used for individual/ungrouped types)
const CHANNEL_LABELS: Record<number, string> = {
  1: 'Debug',
  2: 'Error',
  10: 'Say',
  11: 'Shout',
  12: 'Tell (Out)',
  13: 'Tell (In)',
  14: 'Party',
  15: 'Alliance',
  16: 'LS1',
  17: 'LS2',
  18: 'LS3',
  19: 'LS4',
  20: 'LS5',
  21: 'LS6',
  22: 'LS7',
  23: 'LS8',
  24: 'FC',
  27: 'Novice',
  28: 'Emote',
  29: 'Emote (Std)',
  30: 'Yell',
  32: 'X-Party',
  36: 'PvP Team',
  37: 'CWLS1',
  101: 'CWLS2',
  102: 'CWLS3',
  103: 'CWLS4',
  104: 'CWLS5',
  105: 'CWLS6',
  106: 'CWLS7',
  107: 'CWLS8',
  56: 'Echo',
  69: 'FC Ann.',
  70: 'FC Login',
  75: 'Novice Sys',
  77: 'PvP Ann.',
  78: 'PvP Login',
};

// Types absorbed into groups — rendered as a single grouped checkbox
const GROUPED_TYPE_IDS = new Set(CHANNEL_GROUPS.flatMap((g) => g.types));

type DisplayItem =
  | { kind: 'single'; typeId: number }
  | { kind: 'group'; label: string; types: number[] };

// Build ordered display list: groups replace their member types at the position of the first member
const DISPLAY_ITEMS: DisplayItem[] = (() => {
  const items: DisplayItem[] = [];
  const usedGroupLabels = new Set<string>();
  for (const typeId of TRACKED_CHANNEL_TYPES) {
    if (!GROUPED_TYPE_IDS.has(typeId)) {
      items.push({ kind: 'single', typeId });
    } else {
      const group = CHANNEL_GROUPS.find((g) => g.types.includes(typeId));
      if (group && !usedGroupLabels.has(group.label)) {
        usedGroupLabels.add(group.label);
        items.push({ kind: 'group', label: group.label, types: group.types });
      }
    }
  }
  return items;
})();

interface Props {
  initial: CustomFilter | null; // null = create new
  existingFilterNames: string[]; // existing filter names, excluding this filter
  existingFolderNames: string[]; // folder names used for duplicate check
  onSave: (filter: CustomFilter, oldName: string) => void;
  onClose: () => void;
}

export function FilterEditModal({
  initial,
  existingFilterNames,
  existingFolderNames,
  onSave,
  onClose,
}: Props) {
  const isEdit = initial !== null;

  const [name, setName] = useState(initial?.name ?? '');
  const [notifyUnread, setNotifyUnread] = useState(initial?.notifyUnread ?? false);
  const [defaultSendPrefix, setDefaultSendPrefix] = useState<string>(
    initial?.defaultSendPrefix ?? '',
  );
  const [showChannelTypes, setShowChannelTypes] = useState<number[]>(
    initial?.showChannelTypes ?? [],
  );
  const [nameError, setNameError] = useState('');

  const validateName = (value: string): string => {
    if (!FILTER_NAME_REGEX.test(value)) return FILTER_NAME_ERROR;
    if (existingFilterNames.includes(value)) return 'A filter with this name already exists.';
    if (existingFolderNames.includes(value)) return 'A folder with this name already exists.';
    return '';
  };

  const toggleType = (typeId: number) => {
    setShowChannelTypes((prev) =>
      prev.includes(typeId) ? prev.filter((t) => t !== typeId) : [...prev, typeId],
    );
  };

  const toggleGroup = (types: number[]) => {
    const allSelected = types.every((t) => showChannelTypes.includes(t));
    if (allSelected) {
      setShowChannelTypes((prev) => prev.filter((t) => !types.includes(t)));
    } else {
      setShowChannelTypes((prev) => [...prev, ...types.filter((t) => !prev.includes(t))]);
    }
  };

  const handleSave = () => {
    const err = validateName(name);
    if (err) {
      setNameError(err);
      return;
    }
    onSave(
      {
        name,
        showChannelTypes,
        defaultSendPrefix: defaultSendPrefix === '' ? null : defaultSendPrefix,
        notifyUnread,
      },
      initial?.name ?? name,
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>{isEdit ? 'Edit Filter' : 'New Filter'}</h2>

        {/* ── Filter Name ── */}
        <div className="form-field">
          <label className="form-field-label">Filter Name</label>
          <input
            className={`form-input${nameError ? ' form-input-error' : ''}`}
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
            }}
            autoFocus
            maxLength={32}
            placeholder="e.g. RaidChat"
          />
          {nameError && <span className="form-error">{nameError}</span>}
          {!nameError && (
            <span className="form-hint">Letters, numbers, hyphens, underscores (max 32)</span>
          )}
        </div>

        {/* ── Notification ── */}
        <div className={`form-section ${styles['modal-section']}`}>
          <div className="form-section-title">Notification</div>
          <div className="form-row">
            <span className="form-row-label">Badge (Unread)</span>
            <button
              className={`toggle-switch${notifyUnread ? ' on' : ''}`}
              role="switch"
              aria-checked={notifyUnread}
              onClick={() => setNotifyUnread((v) => !v)}
            >
              <div className="toggle-knob" />
            </button>
          </div>
        </div>

        {/* ── Default Send Channel ── */}
        <div className={`form-section ${styles['modal-section']}`}>
          <div className="form-section-title">Default Send Channel</div>
          <select
            className="form-select"
            value={defaultSendPrefix}
            onChange={(e) => setDefaultSendPrefix(e.target.value)}
          >
            <option value="">Sync with game</option>
            {ALL_CHANNELS.map((ch) => (
              <option key={ch.prefix} value={ch.prefix}>
                {ch.label}
              </option>
            ))}
          </select>
          <span className="form-hint">
            If the selected channel is unavailable (disabled or not joined in-game), the filter will
            sync with the in-game channel instead.
          </span>
        </div>

        {/* ── Show Channel Types ── */}
        <div className={`form-section ${styles['modal-section']}`}>
          <div className={styles['section-header']}>
            <div className="form-section-title">Show Channel Types</div>
            <div className={styles['select-all-btns']}>
              <button
                className={styles['text-btn']}
                onClick={() => setShowChannelTypes([...TRACKED_CHANNEL_TYPES])}
              >
                Select All
              </button>
              <span className={styles.divider}>|</span>
              <button className={styles['text-btn']} onClick={() => setShowChannelTypes([])}>
                Deselect All
              </button>
            </div>
          </div>
          <div className={styles['checkbox-grid']}>
            {DISPLAY_ITEMS.map((item) => {
              if (item.kind === 'single') {
                return (
                  <label key={item.typeId} className={styles['checkbox-item']}>
                    <input
                      type="checkbox"
                      checked={showChannelTypes.includes(item.typeId)}
                      onChange={() => toggleType(item.typeId)}
                    />
                    <span>{CHANNEL_LABELS[item.typeId] ?? String(item.typeId)}</span>
                  </label>
                );
              }
              const allChecked = item.types.every((t) => showChannelTypes.includes(t));
              const someChecked = item.types.some((t) => showChannelTypes.includes(t));
              return (
                <label key={item.label} className={styles['checkbox-item']}>
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={(el) => {
                      if (el) el.indeterminate = someChecked && !allChecked;
                    }}
                    onChange={() => toggleGroup(item.types)}
                  />
                  <span>{item.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="form-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            {isEdit ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
