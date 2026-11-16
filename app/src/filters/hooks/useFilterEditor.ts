import { useCallback, useState } from "react";
import type { FilterTable } from "@/store/filters";
import type { EditorRequest } from "../lib/editor";
import type { FilterTarget } from "../lib/targets";

export function useFilterEditor() {
  const [request, setRequest] = useState<EditorRequest | null>(null);
  const open = useCallback(
    (target: FilterTarget, table: FilterTable, anchor: HTMLElement, viaKeyboard: boolean, returnFocus = anchor) =>
      setTimeout(() => setRequest({ target, table, anchor, returnFocus, instant: viaKeyboard })),
    [],
  );
  const close = useCallback(() => setRequest(null), []);
  return { request, open, close };
}
