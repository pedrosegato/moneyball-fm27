import {
  defaultRangeExtractor,
  type Range,
  type Rect,
  useVirtualizer,
  type Virtualizer,
} from "@tanstack/react-virtual";
import { SearchIcon } from "lucide-react";
import { type FocusEvent, useCallback, useDeferredValue, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { formatCount } from "@/lib/format";

export interface ListOption {
  value: string;
  label: string;
  count?: number;
}

export interface ListFilterProps {
  label?: string;
  options: readonly ListOption[];
  selected: readonly string[];
  onChange: (selected: string[]) => void;
}

const ROW = 28;
const VIEWPORT = 240;

function fixedViewport(_: Virtualizer<HTMLDivElement, Element>, cb: (rect: Rect) => void) {
  cb({ width: 0, height: VIEWPORT });
  return () => {};
}

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export function ListFilter({ label = "Opções", options, selected, onChange }: ListFilterProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const folded = useMemo(() => options.map((o) => fold(o.label)), [options]);
  const visible = useMemo(() => {
    const q = fold(deferredQuery.trim());
    if (!q) return options;
    return options.filter((_, i) => folded[i].includes(q));
  }, [options, folded, deferredQuery]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const [focused, setFocused] = useState<string | null>(null);
  const focusedIndex = useMemo(
    () => (focused === null ? -1 : visible.findIndex((o) => o.value === focused)),
    [visible, focused],
  );
  const rangeExtractor = useCallback(
    (range: Range) => {
      const indexes = defaultRangeExtractor(range);
      if (focusedIndex < 0 || indexes.includes(focusedIndex)) return indexes;
      return focusedIndex < indexes[0] ? [focusedIndex, ...indexes] : [...indexes, focusedIndex];
    },
    [focusedIndex],
  );
  const leaveList = (e: FocusEvent) => {
    if (!listRef.current?.contains(e.relatedTarget)) setFocused(null);
  };

  const virtualizer = useVirtualizer({
    count: visible.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => ROW,
    overscan: 8,
    observeElementRect: fixedViewport,
    rangeExtractor,
  });

  const toggle = (value: string, checked: boolean) =>
    onChange(checked ? [...selected, value] : selected.filter((v) => v !== value));

  const selectVisible = () => {
    const next = [...selected];
    for (const o of visible) if (!selectedSet.has(o.value)) next.push(o.value);
    onChange(next);
  };

  return (
    <div data-slot="list-filter" className="flex w-full flex-col gap-2">
      <InputGroup>
        <InputGroupInput
          type="search"
          aria-label="Buscar"
          placeholder="Buscar"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
      </InputGroup>

      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="xs" onClick={selectVisible} disabled={visible.length === 0}>
          Selecionar visíveis
          <span className="text-fg-muted tabular-nums">{formatCount(visible.length)}</span>
        </Button>
        <Button variant="ghost" size="xs" onClick={() => onChange([])} disabled={selected.length === 0}>
          Limpar
        </Button>
      </div>

      {visible.length === 0 ? (
        <p className="px-2 py-6 text-center text-fg-muted">Nada encontrado para “{deferredQuery.trim()}”</p>
      ) : (
        <fieldset aria-label={label} className="-mx-1">
          <div ref={listRef} className="overflow-y-auto overscroll-contain rounded-md" style={{ maxHeight: VIEWPORT }}>
            <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
              {virtualizer.getVirtualItems().map((row) => {
                const option = visible[row.index];
                const checkboxId = `${listId}-${row.index}`;
                return (
                  <label
                    key={option.value}
                    htmlFor={checkboxId}
                    className="absolute inset-x-0 top-0 flex h-7 cursor-default items-center gap-2.5 rounded-md px-2 select-none hover:bg-surface-hover"
                    style={{ transform: `translateY(${row.start}px)` }}
                  >
                    <Checkbox
                      id={checkboxId}
                      checked={selectedSet.has(option.value)}
                      onCheckedChange={(checked) => toggle(option.value, checked)}
                      onFocus={() => setFocused(option.value)}
                      onBlur={leaveList}
                    />
                    <span className="min-w-0 flex-1 truncate text-fg">{option.label}</span>
                    {option.count != null && (
                      <span className="type-label text-fg-muted tabular-nums">{formatCount(option.count)}</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        </fieldset>
      )}

      <p className="type-caption text-fg-muted tabular-nums" aria-live="polite">
        {selected.length === 0
          ? "Nenhum selecionado"
          : `${formatCount(selected.length)} selecionado${selected.length === 1 ? "" : "s"}`}
      </p>
    </div>
  );
}
