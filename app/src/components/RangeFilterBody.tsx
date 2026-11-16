import { type KeyboardEvent, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { LOCALE } from "@/lib/constants";
import { formatCount, formatDecimal, parseDecimal } from "@/lib/format";
import { countInRange, type DataBounds, histogram } from "@/lib/histogram";
import type { RangeFilterProps } from "./RangeFilter";
import { RangeHistogram } from "./RangeHistogram";
import { BINS, clamp, precisionFor } from "./rangeScale";

type Side = 0 | 1;
const SIDES = [0, 1] as const;

interface RangeFilterBodyProps extends Omit<RangeFilterProps, "values"> {
  values: Float64Array;
  bounds: DataBounds;
  scale: DataBounds;
}

export function RangeFilterBody({
  values,
  distribution,
  distributionLabel,
  bounds,
  scale,
  min,
  max,
  onChange,
}: RangeFilterBodyProps) {
  const { t } = useTranslation();
  const { lo, hi } = bounds;
  const id = useId();
  const { step, decimals } = useMemo(() => precisionFor(values, scale), [values, scale]);
  const barValues = distribution ?? values;
  const bins = useMemo(() => histogram(barValues, scale.lo, scale.hi, BINS), [barValues, scale]);
  const barCount = useMemo(() => bins.reduce((n, b) => n + b, 0), [bins]);
  const peak = useMemo(() => Math.max(...bins), [bins]);

  const committedMin = clamp(min ?? lo, lo, hi);
  const committed: [number, number] = [committedMin, clamp(max ?? hi, committedMin, hi)];
  const [draft, setDraft] = useState<[number, number] | null>(null);
  const [text, setText] = useState<[string | null, string | null]>([null, null]);
  const [invalid, setInvalid] = useState<[boolean, boolean]>([false, false]);
  const [hovered, setHovered] = useState<number | null>(null);

  const [settled, setSettled] = useState([min, max, lo, hi]);
  if (![min, max, lo, hi].every((v, i) => Object.is(v, settled[i]))) {
    setSettled([min, max, lo, hi]);
    setDraft(null);
    setText([null, null]);
    setInvalid([false, false]);
  }
  const [from, to] = draft ?? committed;

  const inRange = useMemo(() => countInRange(values, from, to), [values, from, to]);
  const fmt = (v: number) => formatDecimal(v, decimals);
  const sideLabel = [t("range.min"), t("range.max")] as const;

  const emit = (next: [number, number]) => {
    const a = clamp(next[0], lo, hi);
    const range: [number, number] = [a, clamp(next[1], a, hi)];
    setDraft(range);
    onChange({ min: range[0], max: range[1] });
  };

  const commitText = (side: Side) => {
    const raw = text[side];
    if (raw == null) return;
    const parsed = parseDecimal(raw);
    if (Number.isNaN(parsed)) {
      setInvalid((s) => (side === 0 ? [true, s[1]] : [s[0], true]));
      return;
    }
    setInvalid((s) => (side === 0 ? [false, s[1]] : [s[0], false]));
    setText((prev) => (side === 0 ? [null, prev[1]] : [prev[0], null]));
    emit(side === 0 ? [clamp(parsed, lo, to), to] : [from, clamp(parsed, from, hi)]);
  };

  const onKeyDown = (side: Side) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) commitText(side);
  };

  const roundToStep = (v: number) => Number(v.toFixed(decimals));
  const onSlider = [clamp(from, scale.lo, scale.hi), clamp(to, scale.lo, scale.hi)];
  const fromSlider = ([a, b]: number[]): [number, number] => [
    a === onSlider[0] ? from : a <= scale.lo ? lo : roundToStep(a),
    b === onSlider[1] ? to : b >= scale.hi ? hi : roundToStep(b),
  ];
  const binWidth = (scale.hi - scale.lo) / BINS;
  const hoverText =
    hovered != null
      ? t("range.bin", {
          from: fmt(scale.lo + hovered * binWidth),
          to: fmt(scale.lo + (hovered + 1) * binWidth),
          n: formatCount(bins[hovered]),
        })
      : null;
  const distributionText = { values: formatCount(barCount), lo: fmt(scale.lo), hi: fmt(scale.hi) };
  const errorId = `${id}-erro`;

  return (
    <div data-slot="range-filter" className="flex w-full flex-col gap-3">
      <div className="flex flex-col">
        <RangeHistogram
          label={
            distribution && distributionLabel
              ? t("range.distributionOf", { ...distributionText, label: distributionLabel })
              : t("range.distribution", distributionText)
          }
          bins={bins}
          peak={peak}
          start={scale.lo}
          binWidth={binWidth}
          from={from}
          to={to}
          hovered={hovered}
          onHover={setHovered}
        />
        <Slider
          value={onSlider}
          min={scale.lo}
          max={scale.hi}
          step={step}
          disabled={scale.lo === scale.hi}
          locale={LOCALE}
          getAriaLabel={(i) => sideLabel[i] ?? ""}
          onValueChange={(v) => setDraft(fromSlider(v as number[]))}
          onValueCommitted={(v) => emit(fromSlider(v as number[]))}
        />
      </div>

      <div className="flex items-end gap-2">
        {SIDES.map((side) => (
          <div key={side} className="flex min-w-0 flex-1 flex-col gap-1">
            <label htmlFor={`${id}-${side}`} className="type-caption text-fg-muted">
              {sideLabel[side]}
            </label>
            <Input
              id={`${id}-${side}`}
              inputMode="decimal"
              autoComplete="off"
              className="tabular-nums"
              value={text[side] ?? fmt(side === 0 ? from : to)}
              aria-invalid={invalid[side] || undefined}
              aria-describedby={invalid[side] ? errorId : undefined}
              onChange={(e) => {
                const next = e.target.value;
                setText((prev) => (side === 0 ? [next, prev[1]] : [prev[0], next]));
              }}
              onBlur={() => commitText(side)}
              onKeyDown={onKeyDown(side)}
            />
          </div>
        ))}
      </div>

      {invalid[0] || invalid[1] ? (
        <p id={errorId} className="type-label text-destructive">
          {t("range.invalid", { example: fmt((lo + hi) / 2) })}
        </p>
      ) : (
        <p className="type-caption text-fg-muted tabular-nums">
          {hoverText ?? t("range.inRange", { inRange: formatCount(inRange), total: formatCount(bounds.count) })}
        </p>
      )}
    </div>
  );
}
