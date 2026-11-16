import type { StateCreator } from "zustand";
import { i18n } from "@/i18n";
import type { AppState } from "./index";
import { fieldsOf, listOf, positiveInt, text, uniqueBy } from "./sanitize";

export interface ShortlistFolder {
  id: string;
  name: string;
  uids: number[];
}

export interface ShortlistState {
  folders: ShortlistFolder[];
}

export interface ShortlistSlice {
  shortlist: ShortlistState;
  toggleShortlist(uid: number, folderId?: string): void;
  createFolder(name: string): string | null;
  renameFolder(id: string, name: string): void;
  deleteFolder(id: string): void;
  moveToFolder(uids: readonly number[], fromId: string, toId: string): void;
  addToFolder(uids: readonly number[], folderId: string): void;
  removeFromFolder(uids: readonly number[], folderId: string): void;
}

export const MAX_FOLDERS = 50;
export const MAX_FOLDER_NAME = 80;
export const MAX_FOLDER_PLAYERS = 2000;

const folderName = (name: string) => name.trim().slice(0, MAX_FOLDER_NAME);

function without(uids: readonly number[], dropped: readonly number[]): number[] {
  const drop = new Set(dropped);
  return uids.filter((u) => !drop.has(u));
}

function newFolderId(taken: readonly ShortlistFolder[]): string {
  let id: string;
  do id = `pasta-${Math.random().toString(36).slice(2, 10)}`;
  while (taken.some((f) => f.id === id));
  return id;
}

const DEFAULT_FOLDER_ID = "shortlist";

const defaultShortlist = (): ShortlistState => ({
  folders: [{ id: DEFAULT_FOLDER_ID, name: i18n.t("store:shortlist.defaultFolder"), uids: [] }],
});

export const createShortlistSlice: StateCreator<AppState, [], [], ShortlistSlice> = (set, get) => {
  const setFolders = (update: (folders: ShortlistFolder[]) => ShortlistFolder[]) =>
    set((s) => ({ shortlist: { folders: update(s.shortlist.folders) } }));
  const withUids = (id: string, update: (uids: number[]) => number[]) =>
    setFolders((folders) => folders.map((f) => (f.id === id ? { ...f, uids: update(f.uids) } : f)));

  return {
    shortlist: defaultShortlist(),
    toggleShortlist: (uid, folderId) =>
      withUids(folderId ?? get().shortlist.folders[0]?.id, (uids) =>
        uids.includes(uid) ? uids.filter((u) => u !== uid) : [...uids, uid],
      ),
    createFolder: (name) => {
      const folders = get().shortlist.folders;
      const clean = folderName(name);
      if (!clean || folders.length >= MAX_FOLDERS) return null;
      const id = newFolderId(folders);
      setFolders((all) => [...all, { id, name: clean, uids: [] }]);
      return id;
    },
    renameFolder: (id, name) => {
      const clean = folderName(name);
      if (clean) setFolders((folders) => folders.map((f) => (f.id === id ? { ...f, name: clean } : f)));
    },
    deleteFolder: (id) => setFolders((folders) => (folders.length > 1 ? folders.filter((f) => f.id !== id) : folders)),
    moveToFolder: (moved, fromId, toId) => {
      if (fromId === toId) return;
      setFolders((folders) =>
        folders.map((f) => {
          if (f.id === fromId) return { ...f, uids: without(f.uids, moved) };
          if (f.id === toId) return { ...f, uids: [...f.uids, ...without(moved, f.uids)] };
          return f;
        }),
      );
    },
    addToFolder: (added, folderId) =>
      withUids(folderId, (uids) => [
        ...uids,
        ...without(
          uniqueBy(added, (u) => u),
          uids,
        ),
      ]),
    removeFromFolder: (removed, folderId) => withUids(folderId, (uids) => without(uids, removed)),
  };
};

function restoreFolder(raw: unknown): ShortlistFolder | null {
  const r = fieldsOf(raw);
  const id = text(r.id, 64);
  const name = text(r.name, 80);
  if (id === null || name === null) return null;
  return { id, name, uids: uniqueBy(listOf(r.uids, positiveInt, MAX_FOLDER_PLAYERS), (u) => u) };
}

export function restoreShortlist(raw: unknown): ShortlistState {
  const folders = uniqueBy(listOf(fieldsOf(raw).folders, restoreFolder, MAX_FOLDERS), (f) => f.id);
  return folders.length ? { folders } : defaultShortlist();
}
