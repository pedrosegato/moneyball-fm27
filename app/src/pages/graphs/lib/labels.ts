import { i18n } from "@/i18n";
import { combinedZ } from "./levels";
import type { PointSet } from "./scatter";

export interface QuadrantCaptions {
  topRight: string;
  topLeft: string;
  bottomRight: string;
  bottomLeft: string;
}

export function quadrantCaptions(xAbbr: string, yAbbr: string, short = false): QuadrantCaptions {
  const length = short ? "short" : "long";
  return {
    topRight: i18n.t(`graphs:quadrant.${length}.both`),
    topLeft: i18n.t(`graphs:quadrant.${length}.only`, { abbr: yAbbr }),
    bottomRight: i18n.t(`graphs:quadrant.${length}.only`, { abbr: xAbbr }),
    bottomLeft: i18n.t(`graphs:quadrant.${length}.neither`),
  };
}

export function labeledPoints(points: PointSet, n: number, xHigh: boolean, yHigh: boolean): number[] {
  const combined = combinedZ(points, xHigh, yHigh);
  const top: number[] = [];
  const score: number[] = [];
  for (let k = 0; k < combined.length && n > 0; k++) {
    const z = combined[k];
    if (top.length === n && z <= score[n - 1]) continue;
    let at = top.length;
    while (at > 0 && z > score[at - 1]) at--;
    top.splice(at, 0, k);
    score.splice(at, 0, z);
    if (top.length > n) {
      top.pop();
      score.pop();
    }
  }
  return top;
}

export interface LabelBox {
  x: number;
  y: number;
  width: number;
}

export type LabelAnchor = LabelBox;

const GAP = 7;

export function placeLabels(
  anchors: readonly LabelAnchor[],
  size: { width: number; height: number },
  height: number,
  obstacles: readonly LabelBox[] = [],
): (LabelBox | null)[] {
  const placed: LabelBox[] = [...obstacles];
  const free = (b: LabelBox) =>
    b.x >= 0 &&
    b.y >= 0 &&
    b.x + b.width <= size.width &&
    b.y + height <= size.height &&
    placed.every((p) => b.x >= p.x + p.width || p.x >= b.x + b.width || b.y >= p.y + height || p.y >= b.y + height);
  return anchors.map(({ x, y, width }) => {
    const candidates: LabelBox[] = [
      { x: x + GAP, y: y - height / 2, width },
      { x: x - GAP - width, y: y - height / 2, width },
      { x: x - width / 2, y: y - GAP - height, width },
      { x: x - width / 2, y: y + GAP, width },
      { x: x + GAP, y: y - GAP - height, width },
      { x: x - GAP - width, y: y - GAP - height, width },
      { x: x + GAP, y: y + GAP, width },
      { x: x - GAP - width, y: y + GAP, width },
    ];
    const box = candidates.find(free) ?? null;
    if (box) placed.push(box);
    return box;
  });
}
