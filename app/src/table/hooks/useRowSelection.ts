import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlayerRecord } from "@/data/types";
import {
  checkOf,
  type HeaderCheck,
  keptIn,
  selectedAmong,
  selectRange,
  toggled,
  toggledVisible,
} from "../lib/selection";

const NO_SELECTION: ReadonlySet<number> = new Set();
const NO_UIDS = new Uint32Array();

const ESCAPE_OWNERS = [
  '[role="menu"]',
  '[role="menubar"]',
  '[role="listbox"]',
  "dialog",
  '[role="dialog"]',
  '[role="alertdialog"]',
  "[data-popup-open]",
  "textarea",
  '[contenteditable]:not([contenteditable="false"])',
].join(", ");
const NOT_TEXT = new Set(["checkbox", "radio", "button", "submit", "reset", "range", "color", "file", "image"]);

function ownsEscape(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target instanceof HTMLInputElement && !NOT_TEXT.has(target.type)) return true;
  return target.closest(ESCAPE_OWNERS) !== null;
}

export interface RowSelection {
  selected: ReadonlySet<number>;
  inView: number;
  check: HeaderCheck;
  toggle(uid: number, range: boolean): void;
  toggleAll(): void;
  clear(): void;
  clearAfterAction(): void;
  leaveAtOnce: boolean;
}

export function useRowSelection(rows: Uint32Array, players: readonly PlayerRecord[], enabled: boolean): RowSelection {
  const [selected, setSelected] = useState<ReadonlySet<number>>(NO_SELECTION);
  const [leaveAtOnce, setLeaveAtOnce] = useState(false);
  const anchor = useRef<number | null>(null);

  const [prunedFor, setPrunedFor] = useState(players);
  if (prunedFor !== players) {
    setPrunedFor(players);
    setSelected((prev) => keptIn(prev, players));
  }

  const shownUids = useMemo(
    () => (enabled ? Uint32Array.from(rows, (i) => players[i].uid) : NO_UIDS),
    [enabled, rows, players],
  );
  const inView = useMemo(() => selectedAmong(selected, shownUids), [selected, shownUids]);

  const toggle = useCallback(
    (uid: number, range: boolean) => {
      const from = anchor.current;
      setSelected((prev) => (range ? selectRange(prev, shownUids, from, uid) : toggled(prev, uid)));
      anchor.current = uid;
    },
    [shownUids],
  );
  const toggleAll = useCallback(() => setSelected((prev) => toggledVisible(prev, shownUids)), [shownUids]);
  const clearWith = useCallback((atOnce: boolean) => {
    setSelected(NO_SELECTION);
    setLeaveAtOnce(atOnce);
    anchor.current = null;
  }, []);
  const clear = useCallback(() => clearWith(false), [clearWith]);
  const clearAfterAction = useCallback(() => clearWith(true), [clearWith]);

  const any = selected.size > 0;
  useEffect(() => {
    if (!any) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || e.isComposing || ownsEscape(e.target)) return;
      e.preventDefault();
      clear();
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [any, clear]);

  return {
    selected,
    inView,
    check: checkOf(inView, shownUids.length),
    toggle,
    toggleAll,
    clear,
    clearAfterAction,
    leaveAtOnce,
  };
}
