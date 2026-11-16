import { MARGIN, textWidth, Y_TITLE_X } from "../lib/layout";

const Y_TITLE_TOP = 16;
const X_TITLE_LIFT = 8;
const TITLE_GAP = 12;
const MEAN_GAP = 6;
const MEAN_LIFT = 8;
const MEAN_BASELINE = 4;

interface ScatterGuidesProps {
  xTitle: string;
  yTitle: string;
  xMean: string;
  yMean: string;
  mx: number;
  my: number;
  right: number;
  bottom: number;
  height: number;
}

export function ScatterGuides({ xTitle, yTitle, xMean, yMean, mx, my, right, bottom, height }: ScatterGuidesProps) {
  const titleEnd = Y_TITLE_X + textWidth(yTitle) + TITLE_GAP;
  const xMeanWidth = textWidth(xMean);
  const xMeanLeft = Math.min(Math.max(mx - xMeanWidth / 2, titleEnd), right - xMeanWidth);
  return (
    <>
      <text x={Y_TITLE_X} y={Y_TITLE_TOP} className="fill-fg-secondary type-caption">
        {yTitle}
      </text>
      <text x={right} y={height - X_TITLE_LIFT} textAnchor="end" className="fill-fg-secondary type-caption">
        {xTitle}
      </text>
      <line x1={mx} x2={mx} y1={MARGIN.top} y2={bottom} className="stroke-line-strong" shapeRendering="crispEdges" />
      <line x1={MARGIN.left} x2={right} y1={my} y2={my} className="stroke-line-strong" shapeRendering="crispEdges" />
      {xMeanLeft >= titleEnd && (
        <text x={xMeanLeft} y={MARGIN.top - MEAN_LIFT} className="fill-fg-muted type-caption tabular-nums">
          {xMean}
        </text>
      )}
      <text x={right + MEAN_GAP} y={my + MEAN_BASELINE} className="fill-fg-muted type-caption tabular-nums">
        {yMean}
      </text>
    </>
  );
}
