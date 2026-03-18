import { useState, useRef, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from './Sidebar.module.css';
import type { CustomFilter, FilterFolder } from '../../types/filter';
import { FilterEditModal } from './FilterEditModal';
import { FilterFolderModal } from './FilterFolderModal';
import { ConfirmDialog } from './ConfirmDialog';

// ── Context menu state ──────────────────────────────────────────
type MenuTarget =
  | { kind: 'filter'; name: string; x: number; y: number }
  | { kind: 'folder'; name: string; x: number; y: number };

// ── Modal state ─────────────────────────────────────────────────
type ModalState =
  | { type: 'createFilter'; folderName: string }
  | { type: 'editFilter'; filter: CustomFilter }
  | { type: 'deleteFilter'; name: string }
  | { type: 'createFolder' }
  | { type: 'renameFolder'; name: string }
  | { type: 'deleteFolder'; name: string }
  | null;

// ── Sortable filter row ─────────────────────────────────────────
interface SortableFilterRowProps {
  filterName: string;
  isActive: boolean;
  unread: number;
  onSelect: () => void;
  onOpenMenu: (e: React.MouseEvent) => void;
}

function SortableFilterRow({
  filterName,
  isActive,
  unread,
  onSelect,
  onOpenMenu,
}: SortableFilterRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `filter:${filterName}`,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
      }}
      className={styles['filter-row']}
    >
      <button
        className={[
          styles['channel-item'],
          isActive ? styles.active : '',
          unread > 0 ? styles['has-unread'] : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={onSelect}
      >
        <span className={styles['channel-hash']}>#</span>
        <span className={styles['channel-name']}>{filterName}</span>
        {unread > 0 && (
          <span className={styles['sidebar-unread-pill']}>{unread > 99 ? '99+' : unread}</span>
        )}
      </button>
      <button
        className={styles['filter-menu-btn']}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onOpenMenu}
        aria-label={`${filterName} options`}
      >
        ···
      </button>
    </div>
  );
}

// ── Sortable folder section ─────────────────────────────────────
interface SortableFolderSectionProps {
  folder: FilterFolder;
  filters: CustomFilter[];
  activeFilterName: string;
  unreadMap: Record<string, number>;
  onSelectFilter: (name: string) => void;
  onClose: () => void;
  openFolderMenu: (e: React.MouseEvent, name: string) => void;
  openFilterMenu: (e: React.MouseEvent, name: string) => void;
  setModal: (m: ModalState) => void;
}

function SortableFolderSection({
  folder,
  filters,
  activeFilterName,
  unreadMap,
  onSelectFilter,
  onClose,
  openFolderMenu,
  openFilterMenu,
  setModal,
}: SortableFolderSectionProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `folder:${folder.name}`,
  });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
      }}
      className={styles['channel-section']}
    >
      <div {...attributes} {...listeners} className={styles['channel-section-label']}>
        <div className={styles['folder-label-left']}>
          <button
            className={styles['folder-menu-btn']}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => openFolderMenu(e, folder.name)}
            aria-label={`${folder.name} options`}
          >
            ···
          </button>
          <span>{folder.name}</span>
        </div>
        <button
          className={styles['add-btn']}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setModal({ type: 'createFilter', folderName: folder.name })}
          aria-label={`Add filter to ${folder.name}`}
        >
          ＋
        </button>
      </div>

      {folder.filters.length === 0 && <div className={styles['channel-empty']}>No filters</div>}

      <SortableContext
        items={folder.filters.map((n) => `filter:${n}`)}
        strategy={verticalListSortingStrategy}
      >
        {folder.filters.map((filterName) => {
          if (!filters.find((f) => f.name === filterName)) return null;
          return (
            <SortableFilterRow
              key={filterName}
              filterName={filterName}
              isActive={activeFilterName === filterName}
              unread={unreadMap[filterName] || 0}
              onSelect={() => {
                onSelectFilter(filterName);
                onClose();
              }}
              onOpenMenu={(e) => openFilterMenu(e, filterName)}
            />
          );
        })}
      </SortableContext>
    </div>
  );
}

// ── Main Sidebar ────────────────────────────────────────────────
interface Props {
  isOpen: boolean;
  isConnected: boolean;
  filters: CustomFilter[];
  folders: FilterFolder[];
  activeFilterName: string;
  unreadMap: Record<string, number>;
  onSelectFilter: (name: string) => void;
  onClose: () => void;
  onOpenSettings: () => void;
  onAddFilter: (folderName: string, filter: CustomFilter) => void;
  onEditFilter: (filter: CustomFilter, oldName: string) => void;
  onDeleteFilter: (name: string) => void;
  onAddFolder: (folder: FilterFolder) => void;
  onRenameFolder: (oldName: string, newName: string) => void;
  onDeleteFolder: (name: string) => void;
  onReorderFolders: (newFolders: FilterFolder[]) => void;
}

export function Sidebar({
  isOpen,
  isConnected,
  filters,
  folders,
  activeFilterName,
  unreadMap,
  onSelectFilter,
  onClose,
  onOpenSettings,
  onAddFilter,
  onEditFilter,
  onDeleteFilter,
  onAddFolder,
  onRenameFolder,
  onDeleteFolder,
  onReorderFolders,
}: Props) {
  const [menu, setMenu] = useState<MenuTarget | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Close context menu on outside click
  useEffect(() => {
    if (!menu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menu]);

  const openFilterMenu = (e: React.MouseEvent, filterName: string) => {
    e.stopPropagation();
    setMenu({ kind: 'filter', name: filterName, x: e.clientX, y: e.clientY });
  };

  const openFolderMenu = (e: React.MouseEvent, folderName: string) => {
    e.stopPropagation();
    setMenu({ kind: 'folder', name: folderName, x: e.clientX, y: e.clientY });
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    setDragActiveId(active.id as string);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setDragActiveId(null);
    if (!over || active.id === over.id) return;

    const aId = active.id as string;
    const oId = over.id as string;

    // Reorder folders
    if (aId.startsWith('folder:') && oId.startsWith('folder:')) {
      const oldIdx = folders.findIndex((f) => `folder:${f.name}` === aId);
      const newIdx = folders.findIndex((f) => `folder:${f.name}` === oId);
      if (oldIdx !== -1 && newIdx !== -1) {
        onReorderFolders(arrayMove(folders, oldIdx, newIdx));
      }
      return;
    }

    // Move/reorder filter
    if (aId.startsWith('filter:')) {
      const draggedFilter = aId.slice('filter:'.length);

      if (oId.startsWith('filter:')) {
        // Over another filter: same-folder reorder or cross-folder move
        const overFilter = oId.slice('filter:'.length);
        const srcIdx = folders.findIndex((f) => f.filters.includes(draggedFilter));
        const dstIdx = folders.findIndex((f) => f.filters.includes(overFilter));
        if (srcIdx === -1 || dstIdx === -1) return;

        const newFolders = folders.map((f) => ({ ...f, filters: [...f.filters] }));
        if (srcIdx === dstIdx) {
          const arr = newFolders[srcIdx].filters;
          newFolders[srcIdx].filters = arrayMove(
            arr,
            arr.indexOf(draggedFilter),
            arr.indexOf(overFilter),
          );
        } else {
          newFolders[srcIdx].filters = newFolders[srcIdx].filters.filter(
            (n) => n !== draggedFilter,
          );
          const insertAt = newFolders[dstIdx].filters.indexOf(overFilter);
          newFolders[dstIdx].filters.splice(insertAt, 0, draggedFilter);
        }
        onReorderFolders(newFolders);
      } else if (oId.startsWith('folder:')) {
        // Over a folder header: move filter into that folder (e.g. empty folder)
        const targetFolderName = oId.slice('folder:'.length);
        const srcIdx = folders.findIndex((f) => f.filters.includes(draggedFilter));
        const dstIdx = folders.findIndex((f) => f.name === targetFolderName);
        if (srcIdx === -1 || dstIdx === -1 || srcIdx === dstIdx) return;

        const newFolders = folders.map((f) => ({ ...f, filters: [...f.filters] }));
        newFolders[srcIdx].filters = newFolders[srcIdx].filters.filter((n) => n !== draggedFilter);
        newFolders[dstIdx].filters.push(draggedFilter);
        onReorderFolders(newFolders);
      }
    }
  };

  const filterNames = filters.map((f) => f.name);
  const folderNames = folders.map((f) => f.name);

  return (
    <>
      <aside className={`${styles.sidebar}${isOpen ? ` ${styles.open}` : ''}`}>
        {/* ── Header ── */}
        <div className={styles['sidebar-header']}>
          <span className={styles['sidebar-logo']}>ChatAnywhere</span>
          <div className={styles['header-right']}>
            <button
              className={styles['settings-icon']}
              onClick={onOpenSettings}
              data-tooltip="Settings"
              data-tooltip-pos="bottom"
              aria-label="Settings"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
            <div
              className={`${styles['connection-indicator']} ${isConnected ? styles.online : styles.offline}`}
              data-tooltip={isConnected ? 'Connected' : 'Disconnected'}
              data-tooltip-pos="bottom"
            >
              <span className={styles['antenna-bar']} />
              <span className={styles['antenna-bar']} />
              <span className={styles['antenna-bar']} />
              <span className={styles['antenna-bar']} />
            </div>
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav className={styles['sidebar-nav']}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={folders.map((f) => `folder:${f.name}`)}
              strategy={verticalListSortingStrategy}
            >
              {folders.map((folder) => (
                <SortableFolderSection
                  key={folder.name}
                  folder={folder}
                  filters={filters}
                  activeFilterName={activeFilterName}
                  unreadMap={unreadMap}
                  onSelectFilter={onSelectFilter}
                  onClose={onClose}
                  openFolderMenu={openFolderMenu}
                  openFilterMenu={openFilterMenu}
                  setModal={setModal}
                />
              ))}
            </SortableContext>

            <DragOverlay dropAnimation={null}>
              {dragActiveId?.startsWith('folder:') && (
                <div className={styles['drag-overlay-folder']}>
                  {dragActiveId.slice('folder:'.length)}
                </div>
              )}
              {dragActiveId?.startsWith('filter:') && (
                <div className={styles['drag-overlay-filter']}>
                  <span className={styles['channel-hash']}>#</span>
                  <span className={styles['channel-name']}>
                    {dragActiveId.slice('filter:'.length)}
                  </span>
                </div>
              )}
            </DragOverlay>
          </DndContext>

          {/* ── Add Folder ── */}
          <button
            className={styles['add-folder-btn']}
            onClick={() => setModal({ type: 'createFolder' })}
          >
            + Add Folder
          </button>
        </nav>

        {/* ── DM Section (placeholder) ── */}
        <div className={styles['dm-section']}>
          <div className={styles['channel-section-label']}>
            <span>Direct Messages</span>
            <span className={styles['coming-soon-badge']}>In Development</span>
          </div>
          <div className={styles['channel-empty']}>Not yet implemented</div>
        </div>
      </aside>

      {/* ── Context Menu ── */}
      {menu && (
        <div ref={menuRef} className={styles['context-menu']} style={{ top: menu.y, left: menu.x }}>
          {menu.kind === 'filter' && (
            <>
              <button
                className={styles['context-item']}
                onClick={() => {
                  const filter = filters.find((f) => f.name === menu.name);
                  if (filter) setModal({ type: 'editFilter', filter });
                  setMenu(null);
                }}
              >
                Edit
              </button>
              <button
                className={`${styles['context-item']} ${styles['context-danger']}`}
                onClick={() => {
                  setModal({ type: 'deleteFilter', name: menu.name });
                  setMenu(null);
                }}
              >
                Delete
              </button>
            </>
          )}
          {menu.kind === 'folder' && (
            <>
              <button
                className={styles['context-item']}
                onClick={() => {
                  setModal({ type: 'renameFolder', name: menu.name });
                  setMenu(null);
                }}
              >
                Rename
              </button>
              <button
                className={`${styles['context-item']} ${styles['context-danger']}`}
                onClick={() => {
                  setModal({ type: 'deleteFolder', name: menu.name });
                  setMenu(null);
                }}
              >
                Delete Folder
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {modal?.type === 'createFilter' && (
        <FilterEditModal
          initial={null}
          existingFilterNames={filterNames}
          existingFolderNames={folderNames}
          onSave={(filter) => {
            onAddFilter(modal.folderName, filter);
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'editFilter' && (
        <FilterEditModal
          initial={modal.filter}
          existingFilterNames={filterNames.filter((n) => n !== modal.filter.name)}
          existingFolderNames={folderNames}
          onSave={(filter, oldName) => {
            onEditFilter(filter, oldName);
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'deleteFilter' && (
        <ConfirmDialog
          title={`Delete "${modal.name}"?`}
          body="This cannot be undone."
          onConfirm={() => {
            onDeleteFilter(modal.name);
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'createFolder' && (
        <FilterFolderModal
          existingNames={folderNames}
          onSave={(name) => {
            onAddFolder({ name, filters: [] });
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'renameFolder' && (
        <FilterFolderModal
          initialName={modal.name}
          existingNames={folderNames.filter((n) => n !== modal.name)}
          onSave={(newName) => {
            onRenameFolder(modal.name, newName);
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'deleteFolder' && (
        <ConfirmDialog
          title={`Delete folder "${modal.name}"?`}
          body="All filters inside will also be deleted. This cannot be undone."
          onConfirm={() => {
            onDeleteFolder(modal.name);
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
