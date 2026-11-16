import { useMemo } from "react";
import { cornerCaptions, labelOrder, type NamedPoint, nameLabels, type PlacedText } from "../lib/plotLabels";
import type { PointSet } from "../lib/scatter";

interface PlotLabelsInput {
  plotW: number;
  plotH: number;
  points: PointSet;
  xAbbr: string;
  yAbbr: string;
  labeled: readonly number[];
  selected: number;
  nameOf(k: number): string;
  px: Float32Array;
  py: Float32Array;
}

interface PlotLabels {
  captions: PlacedText[];
  named: number[];
  names: NamedPoint[];
}

const NO_LABELS: PlotLabels = { captions: [], named: [], names: [] };

export function usePlotLabels({
  plotW,
  plotH,
  points,
  xAbbr,
  yAbbr,
  labeled,
  selected,
  nameOf,
  px,
  py,
}: PlotLabelsInput) {
  return useMemo<PlotLabels>(() => {
    if (!plotW || !plotH || !points.rows.length) return NO_LABELS;
    const size = { width: plotW, height: plotH };
    const captions = cornerCaptions(size, xAbbr, yAbbr);
    const named = labelOrder(labeled, selected);
    const names = nameLabels({ order: named, nameOf, px, py, size, obstacles: captions.map((c) => c.box) });
    return { captions, named, names };
  }, [plotW, plotH, points, xAbbr, yAbbr, labeled, selected, nameOf, px, py]);
}
