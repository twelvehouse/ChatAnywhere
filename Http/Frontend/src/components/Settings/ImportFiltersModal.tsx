import { useState, useEffect } from 'react';
import clsx from 'clsx';
import styles from './ImportFiltersModal.module.css';
import { RELAY_ADDR } from '../../constants/config';
import { dispatchUnauthorized } from '../../lib/authEvent';
import type { CustomFilter, FilterFolder } from '../../types/filter';

interface CharacterData {
  key: string;
  filters: CustomFilter[];
  folders: FilterFolder[];
}

type Step = 'char-select' | 'filter-select' | 'conflict';
type ConflictResolution = 'merge' | 'rename';

interface Props {
  currentFilters: CustomFilter[];
  currentFolders: FilterFolder[];
  onImport: (newFilters: CustomFilter[], newFolders: FilterFolder[]) => void;
  onClose: () => void;
}

function uniqueName(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base;
  let i = 1;
  while (existing.has(`${base}_${i}`)) i++;
  return `${base}_${i}`;
}

const FolderIcon = () => (
  <svg
    className={styles['tree-folder-icon']}
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinejoin="round"
  >
    <path d="M2 5.5C2 4.7 2.6 4 3.5 4H7L8.5 5.5H12.5C13.3 5.5 14 6.2 14 7V11.5C14 12.3 13.3 13 12.5 13H3.5C2.6 13 2 12.3 2 11.5V5.5z" />
  </svg>
);

const FilterIcon = () => (
  <svg
    className={styles['tree-leaf-icon']}
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinejoin="round"
  >
    <path d="M2 3h12l-4.5 5.5V13l-3-1.5V8.5L2 3z" />
  </svg>
);

export function ImportFiltersModal({ currentFilters, currentFolders, onImport, onClose }: Props) {
  const [step, setStep] = useState<Step>('char-select');
  const [characters, setCharacters] = useState<CharacterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set());
  const [conflictingFolders, setConflictingFolders] = useState<string[]>([]);
  const [resolutions, setResolutions] = useState<Record<string, ConflictResolution>>({});

  useEffect(() => {
    fetch(`${RELAY_ADDR}/settings/characters`, { credentials: 'include' })
      .then((r) => {
        if (r.status === 401) {
          dispatchUnauthorized();
          return;
        }
        if (!r.ok) throw new Error('fetch failed');
        return r.json() as Promise<CharacterData[]>;
      })
      .then((data) => {
        if (!data) return;
        setCharacters(data);
        setLoading(false);
      })
      .catch(() => {
        setFetchError(true);
        setLoading(false);
      });
  }, []);

  const selectedCharacter = characters.find((c) => c.key === selectedKey) ?? null;

  const toggleFilter = (name: string) =>
    setSelectedFilters((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const toggleFolder = (folder: FilterFolder) => {
    const validNames = folder.filters.filter((name) =>
      selectedCharacter?.filters.some((f) => f.name === name),
    );
    const allChecked = validNames.every((name) => selectedFilters.has(name));
    setSelectedFilters((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        validNames.forEach((name) => next.delete(name));
      } else {
        validNames.forEach((name) => next.add(name));
      }
      return next;
    });
  };

  const getFolderState = (folder: FilterFolder): 'checked' | 'indeterminate' | 'unchecked' => {
    const validNames = folder.filters.filter((name) =>
      selectedCharacter?.filters.some((f) => f.name === name),
    );
    if (validNames.length === 0) return 'unchecked';
    const count = validNames.filter((name) => selectedFilters.has(name)).length;
    if (count === 0) return 'unchecked';
    if (count === validNames.length) return 'checked';
    return 'indeterminate';
  };

  const derivedFoldersToImport = (): FilterFolder[] =>
    (selectedCharacter?.folders ?? []).filter((folder) =>
      folder.filters.some((name) => selectedFilters.has(name)),
    );

  const handleProceed = () => {
    if (!selectedCharacter || selectedFilters.size === 0) return;

    const existingFolderNames = new Set(currentFolders.map((f) => f.name));
    const conflicts = derivedFoldersToImport()
      .map((f) => f.name)
      .filter((name) => existingFolderNames.has(name));

    if (conflicts.length > 0) {
      setConflictingFolders(conflicts);
      setResolutions(
        Object.fromEntries(conflicts.map((name) => [name, 'merge' as ConflictResolution])),
      );
      setStep('conflict');
    } else {
      applyImport({});
    }
  };

  const applyImport = (folderResolutions: Record<string, ConflictResolution>) => {
    if (!selectedCharacter) return;

    const existingFilterNames = new Set(currentFilters.map((f) => f.name));
    const renameMap = new Map<string, string>();
    const tempNames = new Set(existingFilterNames);

    for (const name of selectedFilters) {
      const final = uniqueName(name, tempNames);
      renameMap.set(name, final);
      tempNames.add(final);
    }

    const newFilters = [...currentFilters];
    for (const [orig, final] of renameMap) {
      const filter = selectedCharacter.filters.find((f) => f.name === orig);
      if (filter) newFilters.push({ ...filter, name: final });
    }

    const newFolders = [...currentFolders];
    const existingFolderNames = new Set(currentFolders.map((f) => f.name));
    const tempFolderNames = new Set(existingFolderNames);

    for (const folder of derivedFoldersToImport()) {
      const remappedFilters = folder.filters
        .filter((name) => selectedFilters.has(name))
        .map((name) => renameMap.get(name) ?? name);

      if (existingFolderNames.has(folder.name)) {
        const resolution = folderResolutions[folder.name] ?? 'merge';
        if (resolution === 'merge') {
          const idx = newFolders.findIndex((f) => f.name === folder.name);
          if (idx !== -1) {
            const existing = newFolders[idx];
            const existingSet = new Set(existing.filters);
            const toAdd = remappedFilters.filter((n) => !existingSet.has(n));
            newFolders[idx] = { ...existing, filters: [...existing.filters, ...toAdd] };
          }
        } else {
          const final = uniqueName(folder.name, tempFolderNames);
          tempFolderNames.add(final);
          newFolders.push({ name: final, filters: remappedFilters });
        }
      } else {
        tempFolderNames.add(folder.name);
        newFolders.push({ name: folder.name, filters: remappedFilters });
      }
    }

    onImport(newFilters, newFolders);
    onClose();
  };

  const allFolderFilterNames = new Set(
    (selectedCharacter?.folders ?? []).flatMap((f) => f.filters),
  );
  const orphanFilters = (selectedCharacter?.filters ?? []).filter(
    (f) => !allFolderFilterNames.has(f.name),
  );

  const stepTitle =
    step === 'char-select'
      ? 'Import Filters'
      : step === 'filter-select'
        ? 'Select Filters to Import'
        : 'Resolve Folder Conflicts';

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{stepTitle}</h2>
          <button className={styles['close-btn']} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.body}>
          {/* ── Step 1: Character select ── */}
          {step === 'char-select' && (
            <>
              <p className={styles.description}>
                Select a character to import filters from. The selected filters will be added to{' '}
                <strong>this character&apos;s settings</strong>.
              </p>
              {loading && <p className={styles['state-message']}>Loading…</p>}
              {fetchError && (
                <p className={styles['state-message']}>Failed to load character settings.</p>
              )}
              {!loading && !fetchError && characters.length === 0 && (
                <p className={styles['state-message']}>No other character settings found.</p>
              )}
              {!loading && !fetchError && characters.length > 0 && (
                <div className={styles['char-list']}>
                  {characters.map((c) => (
                    <div
                      key={c.key}
                      className={clsx(
                        styles['char-item'],
                        selectedKey === c.key && styles.selected,
                      )}
                      onClick={() => setSelectedKey(c.key)}
                    >
                      <div className={styles['char-radio']} />
                      {c.key}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Step 2: Tree select ── */}
          {step === 'filter-select' && selectedCharacter && (
            <>
              {selectedCharacter.filters.length === 0 ? (
                <p className={styles['state-message']}>This character has no filters to import.</p>
              ) : (
                <div className={styles.tree}>
                  {selectedCharacter.folders.map((folder) => {
                    const state = getFolderState(folder);
                    return (
                      <div key={folder.name} className={styles['tree-folder']}>
                        <div
                          className={clsx(
                            styles['tree-folder-row'],
                            state === 'checked' && styles['folder-checked'],
                            state === 'indeterminate' && styles['folder-indeterminate'],
                          )}
                          onClick={() => toggleFolder(folder)}
                        >
                          <FolderIcon />
                          {folder.name}
                        </div>
                        <div className={styles['tree-children']}>
                          {folder.filters
                            .filter((name) =>
                              selectedCharacter.filters.some((f) => f.name === name),
                            )
                            .map((name) => (
                              <div
                                key={name}
                                className={clsx(
                                  styles['tree-leaf'],
                                  selectedFilters.has(name) && styles['leaf-selected'],
                                )}
                                onClick={() => toggleFilter(name)}
                              >
                                <FilterIcon />
                                {name}
                              </div>
                            ))}
                        </div>
                      </div>
                    );
                  })}
                  {orphanFilters.length > 0 && (
                    <>
                      {selectedCharacter.folders.length > 0 && (
                        <div className={styles['orphan-title']}>OTHER FILTERS</div>
                      )}
                      {orphanFilters.map((f) => (
                        <div
                          key={f.name}
                          className={clsx(
                            styles['tree-leaf'],
                            selectedFilters.has(f.name) && styles['leaf-selected'],
                          )}
                          onClick={() => toggleFilter(f.name)}
                        >
                          <FilterIcon />
                          {f.name}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Step 3: Conflict resolution ── */}
          {step === 'conflict' && (
            <>
              <p className={styles.description}>
                The following folders already exist. Choose how to handle each one.
              </p>
              {conflictingFolders.map((name) => {
                const renamed = uniqueName(name, new Set(currentFolders.map((f) => f.name)));
                return (
                  <div key={name} className={styles['conflict-item']}>
                    <div className={styles['conflict-name']}>
                      &ldquo;{name}&rdquo; already exists
                    </div>
                    <div className={styles['conflict-options']}>
                      <label className={styles['conflict-option']}>
                        <input
                          type="radio"
                          name={`conflict-${name}`}
                          checked={resolutions[name] === 'merge'}
                          onChange={() => setResolutions((prev) => ({ ...prev, [name]: 'merge' }))}
                        />
                        <div>
                          <div className={styles['conflict-option-label']}>
                            Merge into existing folder
                          </div>
                          <div className={styles['conflict-option-hint']}>
                            Add imported filters into the existing &ldquo;{name}&rdquo; folder
                          </div>
                        </div>
                      </label>
                      <label className={styles['conflict-option']}>
                        <input
                          type="radio"
                          name={`conflict-${name}`}
                          checked={resolutions[name] === 'rename'}
                          onChange={() => setResolutions((prev) => ({ ...prev, [name]: 'rename' }))}
                        />
                        <div>
                          <div className={styles['conflict-option-label']}>
                            Import as new folder
                          </div>
                          <div className={styles['conflict-option-hint']}>
                            Create as &ldquo;{renamed}&rdquo;
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        <div className={styles.footer}>
          {step === 'char-select' && (
            <>
              <button className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={!selectedKey}
                onClick={() => setStep('filter-select')}
              >
                Next →
              </button>
            </>
          )}
          {step === 'filter-select' && (
            <>
              <button className="btn btn-secondary" onClick={() => setStep('char-select')}>
                ← Back
              </button>
              <button
                className="btn btn-primary"
                disabled={selectedFilters.size === 0}
                onClick={handleProceed}
              >
                Import
              </button>
            </>
          )}
          {step === 'conflict' && (
            <>
              <button className="btn btn-secondary" onClick={() => setStep('filter-select')}>
                ← Back
              </button>
              <button className="btn btn-primary" onClick={() => applyImport(resolutions)}>
                Import
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
