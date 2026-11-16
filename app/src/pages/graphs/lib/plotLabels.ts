import { type LabelBox, placeLabels, quadrantCaptions } from "./labels";
import { DOT_CLEARANCE, LABEL_HEIGHT, MARGIN, shortName, textWidth } from "./layout";

const CAPTION_INSET = 6;
const CAPTION_EDGE = 4;
const CAPTION_GAP = 24;

export interface PlacedText {
  text: string;
  box: LabelBox;
}

export interface NamedPoint extends PlacedText {
  k: number;
}

interface PlotSize {
  width: number;
  height: number;
}

export function cornerCaptions({ width, height }: PlotSize, xAbbr: string, yAbbr: string): PlacedText[] {
  const corner = (text: string, top: boolean, left: boolean) => {
    const w = textWidth(text);
    return {
      text,
      box: {
        x: left ? CAPTION_INSET : width - CAPTION_INSET - w,
        y: top ? CAPTION_EDGE : height - CAPTION_EDGE - LABEL_HEIGHT,
        width: w,
      },
    };
  };
  const fits = (left: string, right: string) => textWidth(left) + textWidth(right) + CAPTION_GAP <= width;
  const long = quadrantCaptions(xAbbr, yAbbr);
  const text =
    fits(long.topLeft, long.topRight) && fits(long.bottomLeft, long.bottomRight)
      ? long
      : quadrantCaptions(xAbbr, yAbbr, true);
  return [
    corner(text.topRight, true, false),
    corner(text.topLeft, true, true),
    corner(text.bottomRight, false, false),
    corner(text.bottomLeft, false, true),
  ];
}

export const labelOrder = (labeled: readonly number[], selected: number): number[] =>
  selected >= 0 && !labeled.includes(selected) ? [selected, ...labeled] : [...labeled];

interface NameLabelsInput {
  order: readonly number[];
  nameOf(k: number): string;
  px: Float32Array;
  py: Float32Array;
  size: PlotSize;
  obstacles: readonly LabelBox[];
}

export function nameLabels({ order, nameOf, px, py, size, obstacles }: NameLabelsInput): NamedPoint[] {
  const anchors = order.map((k) => {
    const text = shortName(nameOf(k));
    return { k, text, anchor: { x: px[k] - MARGIN.left, y: py[k] - MARGIN.top, width: textWidth(text) } };
  });
  const dotsInTheWay = anchors.map(({ anchor }) => ({
    x: anchor.x - DOT_CLEARANCE,
    y: anchor.y - LABEL_HEIGHT / 2,
    width: DOT_CLEARANCE * 2,
  }));
  const boxes = placeLabels(
    anchors.map((a) => a.anchor),
    size,
    LABEL_HEIGHT,
    [...obstacles, ...dotsInTheWay],
  );
  return anchors.flatMap((a, j) => {
    const box = boxes[j];
    return box ? [{ k: a.k, text: a.text, box }] : [];
  });
}
