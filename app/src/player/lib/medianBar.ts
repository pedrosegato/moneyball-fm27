export interface MedianBar {
  side: string;
  width: string;
}

const MEDIAN = 50;

export function medianBar(pct: number): MedianBar | null {
  if (Number.isNaN(pct)) return null;
  const delta = Math.round(pct) - MEDIAN;
  if (delta === 0) return null;
  return {
    side: delta > 0 ? "left-[calc(50%+1px)] rounded-r-xs" : "right-[calc(50%+1px)] rounded-l-xs",
    width: `calc(${Math.abs(delta)}% - 1px)`,
  };
}
