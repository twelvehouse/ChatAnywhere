import { useState, useEffect, useTransition } from 'react';
import clsx from 'clsx';
import { Search, X, FileText } from 'lucide-react';
import styles from './EmoteTab.module.css';
import type { Emote } from '../../hooks/useEmoteList';
import { RELAY_ADDR } from '../../constants/config';
import { useSettingsStore } from '../../store/settingsStore';

interface Props {
  emotes: Emote[];
  loading: boolean;
  error: string | null;
  /** Called with the final command string (including optional " motion" suffix). */
  onExecute: (command: string) => void;
}

export function EmoteTab({ emotes, loading, error, onExecute }: Props) {
  const emoteConfirm = useSettingsStore((s) => s.emoteConfirm);
  const emoteSortByName = useSettingsStore((s) => s.emoteSortByName);
  const [search, setSearch] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [, startTransition] = useTransition();

  // pendingKey tracks which specific row instance is pending: "<section>-<id>" (e.g. "history-1", "main-1")
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  // Log output toggle: true = emote appears in chat log (no suffix), false = adds " motion"
  const [logOutput, setLogOutput] = useState(
    () => localStorage.getItem('sys-emote-log-output') !== 'false',
  );

  // History: ordered list of recently executed emote IDs (most recent first, max 5)
  const [history, setHistory] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('sys-emote-history') ?? '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('sys-emote-log-output', logOutput.toString());
  }, [logOutput]);

  useEffect(() => {
    localStorage.setItem('sys-emote-history', JSON.stringify(history));
  }, [history]);

  const buildCommand = (emote: Emote) => (logOutput ? emote.command : `${emote.command} motion`);

  const q = filterQuery.toLowerCase();
  const filtered = emotes.filter(
    (e) =>
      e.isOwned && (!q || e.name.toLowerCase().includes(q) || e.command.toLowerCase().includes(q)),
  );
  if (emoteSortByName) filtered.sort((a, b) => a.name.localeCompare(b.name));

  const historyEmotes = history
    .map((id) => emotes.find((e) => e.id === id))
    .filter((e): e is Emote => !!e && e.isOwned);

  const executeEmote = (emote: Emote) => {
    onExecute(buildCommand(emote));
    setHistory((prev) => [emote.id, ...prev.filter((id) => id !== emote.id)].slice(0, 5));
  };

  const handleEmoteClick = (emote: Emote, keyPrefix: string) => {
    const key = `${keyPrefix}-${emote.id}`;
    if (!emoteConfirm) {
      executeEmote(emote);
      return;
    }
    if (pendingKey === key) {
      executeEmote(emote);
      setPendingKey(null);
    } else {
      setPendingKey(key);
    }
  };

  const renderRow = (emote: Emote, keyPrefix: string) => {
    const isPendingRow = pendingKey === `${keyPrefix}-${emote.id}`;
    return (
      <button
        key={`${keyPrefix}-${emote.id}`}
        type="button"
        className={clsx(styles['emote-row'], isPendingRow && styles.pending)}
        onClick={() => handleEmoteClick(emote, keyPrefix)}
      >
        <img
          className={styles['emote-icon']}
          src={`${RELAY_ADDR}/icon/${emote.iconId}`}
          alt={emote.name}
          width={30}
          height={30}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const el = e.currentTarget.nextElementSibling as HTMLElement | null;
            if (el?.classList.contains(styles['emote-icon-fallback'])) {
              el.style.display = '';
            }
          }}
        />
        <span className={styles['emote-icon-fallback']} style={{ display: 'none' }} aria-hidden />
        <span className={styles['emote-name']}>{emote.name}</span>
        <span className={styles['emote-command']}>{emote.command}</span>
        {isPendingRow && <span className={styles['emote-play']}>Perform</span>}
      </button>
    );
  };

  const showHistory = historyEmotes.length > 0 && !search && !filterQuery;

  return (
    <div className={styles['emote-tab']}>
      <div className={styles['search-bar']}>
        <div className={styles['search-input-wrapper']}>
          <Search className={styles['search-icon']} size={14} strokeWidth={1.6} aria-hidden />
          <input
            type="text"
            className={styles['search-input']}
            placeholder="Search emotes..."
            value={search}
            onChange={(e) => {
              const val = e.target.value;
              setSearch(val);
              setPendingKey(null);
              startTransition(() => {
                setFilterQuery(val);
              });
            }}
          />
          {search && (
            <button
              type="button"
              className={styles['clear-btn']}
              aria-label="Clear search"
              onClick={() => {
                setSearch('');
                setPendingKey(null);
                startTransition(() => {
                  setFilterQuery('');
                });
              }}
            >
              <X size={14} strokeWidth={2} aria-hidden />
            </button>
          )}
        </div>
        <button
          type="button"
          className={styles['log-toggle-wrapper']}
          aria-label="Emote Log"
          aria-pressed={logOutput}
          data-tooltip="Emote Log"
          onClick={() => setLogOutput((v) => !v)}
        >
          <FileText className={styles['log-icon']} size={14} strokeWidth={1.5} aria-hidden />
          <div className={clsx('toggle-switch', logOutput && 'on')}>
            <div className="toggle-knob" />
          </div>
        </button>
      </div>

      <div className={styles['emote-list']}>
        {loading &&
          Array.from({ length: 8 }, (_, i) => (
            <div key={i} className={styles['skeleton-row']}>
              <div className={styles['skeleton-icon']} />
              <div className={styles['skeleton-name-wrap']}>
                <div
                  className={styles['skeleton-name']}
                  style={{ width: `${30 + ((i * 13) % 30)}%` }}
                />
              </div>
              <div className={styles['skeleton-command']} />
            </div>
          ))}
        {error && <div className={styles['emote-empty']}>Failed to load emotes.</div>}
        {!loading && !error && (
          <>
            {showHistory && (
              <>
                <div className={styles['history-heading']}>Recent</div>
                {historyEmotes.map((emote) => renderRow(emote, 'history'))}
                <div className={styles['history-divider']} />
              </>
            )}
            {filtered.length === 0 ? (
              <div className={styles['emote-empty']}>No emotes found</div>
            ) : (
              filtered.map((emote) => renderRow(emote, 'main'))
            )}
          </>
        )}
      </div>
    </div>
  );
}
