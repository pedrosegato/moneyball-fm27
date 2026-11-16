export const UI_FONT = '500 11px "Geist Variable", system-ui, sans-serif';

type Measurer = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

let measurer: Measurer | null | undefined;

function createMeasurer(): Measurer | null {
  if (typeof OffscreenCanvas === "function") return new OffscreenCanvas(1, 1).getContext("2d");
  return typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
}

export function measureText(text: string, font: string = UI_FONT): number | null {
  if (measurer === undefined) measurer = createMeasurer();
  if (!measurer) return null;
  measurer.font = font;
  return measurer.measureText(text).width;
}
