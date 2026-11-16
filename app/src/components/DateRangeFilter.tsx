import { type ChangeEvent, type KeyboardEvent, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCount } from "@/lib/format";

export interface DateRange {
  min: string;
  max: string;
}

export interface DateRangeFilterProps {
  label?: string;
  values: readonly (string | null)[];
  min?: string | null;
  max?: string | null;
  reference?: string | null;
  onChange: (range: DateRange) => void;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const isWholeDate = (v: string) => ISO_DATE.test(v) && Number(v.slice(0, 4)) >= 1900;

const WINDOWS = [
  { months: 6, label: "Até 6 meses" },
  { months: 12, label: "Até 1 ano" },
  { months: 24, label: "Até 2 anos" },
] as const;

function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(d, lastDay));
  return first.toISOString().slice(0, 10);
}

const clampDate = (v: string, lo: string, hi: string) => (v < lo ? lo : v > hi ? hi : v);

function dateBounds(values: readonly (string | null)[]) {
  let lo: string | null = null;
  let hi: string | null = null;
  for (const raw of values) {
    if (!raw) continue;
    const v = raw.slice(0, 10);
    if (lo == null || v < lo) lo = v;
    if (hi == null || v > hi) hi = v;
  }
  return lo && hi ? { lo, hi } : null;
}

function countDates(values: readonly (string | null)[], from: string, to: string) {
  let inRange = 0;
  let withDate = 0;
  for (const raw of values) {
    if (!raw) continue;
    withDate++;
    const v = raw.slice(0, 10);
    if (v >= from && v <= to) inRange++;
  }
  return { inRange, withDate };
}

export function DateRangeFilter({
  label = "Intervalo de datas",
  values,
  min,
  max,
  reference,
  onChange,
}: DateRangeFilterProps) {
  const id = useId();
  const bounds = useMemo(() => dateBounds(values), [values]);
  const [draft, setDraft] = useState<DateRange | null>(null);
  const [text, setText] = useState<[string | null, string | null]>([null, null]);
  const typingDigits = useRef(false);

  const [settled, setSettled] = useState([min, max, bounds?.lo, bounds?.hi]);
  if (![min, max, bounds?.lo, bounds?.hi].every((v, i) => v === settled[i])) {
    setSettled([min, max, bounds?.lo, bounds?.hi]);
    setDraft(null);
    setText([null, null]);
  }

  const committedFrom = bounds && clampDate(min ?? bounds.lo, bounds.lo, bounds.hi);
  const from = draft?.min ?? committedFrom;
  const to = draft?.max ?? (bounds && from && clampDate(max ?? bounds.hi, from, bounds.hi));
  const counts = useMemo(() => (from && to ? countDates(values, from, to) : null), [values, from, to]);

  if (!bounds || !from || !to || !counts) {
    return <p className="py-4 text-center text-fg-muted">Nenhuma data nesta coluna</p>;
  }
  const { lo, hi } = bounds;

  const emit = (a: string, b: string) => {
    const nextMin = clampDate(a, lo, hi);
    const range = { min: nextMin, max: clampDate(b, nextMin, hi) };
    setDraft(range);
    onChange(range);
  };

  const commit = (side: 0 | 1, raw: string | null) => {
    setText((t) => (side === 0 ? [null, t[1]] : [t[0], null]));
    if (raw == null || !ISO_DATE.test(raw)) return;
    if (side === 0) emit(raw, to);
    else emit(from, raw);
  };

  const onFieldChange = (side: 0 | 1) => (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    const typing = typingDigits.current || !!(e.nativeEvent as Partial<InputEvent>).inputType;
    if (!typing && isWholeDate(next)) commit(side, next);
    else setText((t) => (side === 0 ? [next, t[1]] : [t[0], next]));
  };

  const onFieldKeyDown = (side: 0 | 1) => (e: KeyboardEvent<HTMLInputElement>) => {
    typingDigits.current = /^\d$/.test(e.key);
    if (e.key === "Enter") commit(side, text[side]);
  };

  return (
    <fieldset data-slot="date-range-filter" className="flex w-full min-w-0 flex-col gap-3">
      <legend className="sr-only">{label}</legend>
      <div className="flex items-end gap-2">
        {([0, 1] as const).map((side) => (
          <div key={side} className="flex min-w-0 flex-1 flex-col gap-1">
            <label htmlFor={`${id}-${side}`} className="type-caption text-fg-muted">
              {side === 0 ? "De" : "Até"}
            </label>
            <Input
              id={`${id}-${side}`}
              type="date"
              min={lo}
              max={hi}
              className="tabular-nums"
              value={text[side] ?? (side === 0 ? from : to)}
              onChange={onFieldChange(side)}
              onPointerDown={() => (typingDigits.current = false)}
              onBlur={() => {
                typingDigits.current = false;
                commit(side, text[side]);
              }}
              onKeyDown={onFieldKeyDown(side)}
            />
          </div>
        ))}
      </div>

      {reference && (
        <fieldset className="flex flex-wrap gap-1.5" aria-label="Contrato termina em">
          {WINDOWS.map((w) => (
            <Button
              key={w.months}
              variant="outline"
              size="xs"
              onClick={() => emit(reference, addMonths(reference, w.months))}
            >
              {w.label}
            </Button>
          ))}
        </fieldset>
      )}

      <p className="type-caption text-fg-muted tabular-nums">
        {formatCount(counts.inRange)} de {formatCount(counts.withDate)} no intervalo
      </p>
    </fieldset>
  );
}
