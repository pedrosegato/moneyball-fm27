import type { PlayerRecord } from "@/data/types";
import { appStore } from "@/store/index";
import { MAX_FOLDER_PLAYERS, type ShortlistFolder } from "@/store/shortlist";
import { tableText } from "./tableText";

export function inFolder(folder: ShortlistFolder, players: readonly PlayerRecord[]): number {
  const held = new Set(folder.uids);
  return players.filter((p) => held.has(p.uid)).length;
}

export function toggleFolder(folder: ShortlistFolder, players: readonly PlayerRecord[]): void {
  const { addToFolder, removeFromFolder } = appStore.getState();
  const uids = players.map((p) => p.uid);
  if (inFolder(folder, players) === players.length) removeFromFolder(uids, folder.id);
  else addToFolder(uids, folder.id);
}

export const folderBlock = (folder: ShortlistFolder, players: readonly PlayerRecord[]): string | null =>
  folder.uids.length + players.length - inFolder(folder, players) > MAX_FOLDER_PLAYERS
    ? tableText("action.folderLimit", { max: MAX_FOLDER_PLAYERS })
    : null;
