import { cn } from "@/lib/utils";
import { BINS } from "./rangeScale";

const BIN_NUMBERS = Array.from({ length: BINS }, (_, bin) => bin);

interface RangeHistogramProps {
  label: string;
  bins: readonly number[];
  peak: number;
  start: number;
  binWidth: number;
  from: number;
  to: number;
  hovered: number | null;
  onHover(bin: number | null): void;
}

export function RangeHistogram({
  label,
  bins,
  peak,
  start,
  binWidth,
  from,
  to,
  hovered,
  onHover,
}: RangeHistogramProps) {
  return (
    <div
      role="img"
      aria-label={label}
      className="flex h-12 items-stretch gap-0.5 px-[0.4375rem]"
      onPointerLeave={() => onHover(null)}
    >
      {BIN_NUMBERS.map((i) => {
        const n = bins[i];
        const binStart = start + i * binWidth;
        const selected = binStart + binWidth >= from && binStart <= to;
        return (
          <div key={i} className="flex flex-1 items-end" onPointerEnter={() => onHover(i)}>
            {n > 0 && (
              <div
                className={cn(
                  "w-full rounded-t-xs",
                  selected ? "bg-fg-faint" : "bg-surface-active",
                  hovered === i && "bg-fg-muted",
                )}
                style={{ height: `max(2px, ${(n / peak) * 100}%)` }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
