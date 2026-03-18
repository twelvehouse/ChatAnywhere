import type { Dispatch, SetStateAction } from 'react';
import type { CustomFilter, FilterFolder } from '../types/filter';

interface Options {
  filters: CustomFilter[];
  setFilters: Dispatch<SetStateAction<CustomFilter[]>>;
  folders: FilterFolder[];
  setFolders: Dispatch<SetStateAction<FilterFolder[]>>;
  activeFilterName: string;
  setUnreadMap: Dispatch<SetStateAction<Record<string, number>>>;
  selectFilter: (name: string) => void;
}

export function useFilterManagement({
  filters,
  setFilters,
  folders,
  setFolders,
  activeFilterName,
  setUnreadMap,
  selectFilter,
}: Options) {
  const handleAddFilter = (folderName: string, filter: CustomFilter) => {
    setFilters((prev) => [...prev, filter]);
    setFolders((prev) =>
      prev.map((folder) =>
        folder.name === folderName
          ? { ...folder, filters: [...folder.filters, filter.name] }
          : folder,
      ),
    );
  };

  const handleEditFilter = (updated: CustomFilter, oldName: string) => {
    setFilters((prev) => prev.map((f) => (f.name === oldName ? updated : f)));
    if (oldName !== updated.name) {
      setFolders((prev) =>
        prev.map((folder) => ({
          ...folder,
          filters: folder.filters.map((n) => (n === oldName ? updated.name : n)),
        })),
      );
      setUnreadMap((prev) => {
        const next = { ...prev };
        if (next[oldName] !== undefined) {
          next[updated.name] = next[oldName];
          delete next[oldName];
        }
        return next;
      });
      if (activeFilterName === oldName) {
        selectFilter(updated.name);
      }
    }
  };

  const handleDeleteFilter = (name: string) => {
    setFilters((prev) => prev.filter((f) => f.name !== name));
    setFolders((prev) =>
      prev.map((folder) => ({
        ...folder,
        filters: folder.filters.filter((n) => n !== name),
      })),
    );
    setUnreadMap((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
    if (activeFilterName === name) {
      const remaining = filters.filter((f) => f.name !== name);
      const nextName = remaining[0]?.name ?? '';
      if (nextName) selectFilter(nextName);
    }
  };

  const handleAddFolder = (folder: FilterFolder) => {
    setFolders((prev) => [...prev, folder]);
  };

  const handleReorderFolders = (newFolders: FilterFolder[]) => {
    setFolders(newFolders);
  };

  const handleRenameFolder = (oldName: string, newName: string) => {
    setFolders((prev) =>
      prev.map((folder) => (folder.name === oldName ? { ...folder, name: newName } : folder)),
    );
  };

  const handleDeleteFolder = (name: string) => {
    const folder = folders.find((f) => f.name === name);
    if (!folder) return;
    const filterNamesInFolder = folder.filters;
    setFilters((prev) => prev.filter((f) => !filterNamesInFolder.includes(f.name)));
    setFolders((prev) => prev.filter((f) => f.name !== name));
    setUnreadMap((prev) => {
      const next = { ...prev };
      filterNamesInFolder.forEach((n) => delete next[n]);
      return next;
    });
    if (filterNamesInFolder.includes(activeFilterName)) {
      const remainingFilters = filters.filter((f) => !filterNamesInFolder.includes(f.name));
      const nextName = remainingFilters[0]?.name ?? '';
      if (nextName) selectFilter(nextName);
    }
  };

  return {
    handleAddFilter,
    handleEditFilter,
    handleDeleteFilter,
    handleAddFolder,
    handleReorderFolders,
    handleRenameFolder,
    handleDeleteFolder,
  };
}
