import { measureText } from "@/lib/measureText";

export const MARGIN = { top: 30, right: 76, bottom: 44, left: 52 } as const;
export const Y_TITLE_X = 8;
export const HIT_RADIUS = 12;
export const LABEL_HEIGHT = 14;
export const LABEL_BASELINE = 11;
export const DOT_CLEARANCE = 6;
const LABEL_CHARS = 26;
const FALLBACK_CHAR_PX = 6.2;
const TIP_EDGE = 80;
const TIP_WIDTH = 260;

export function dotStyle(count: number): { r: number; alpha: number } {
  if (count <= 1500) return { r: 3.5, alpha: 0.7 };
  if (count <= 8000) return { r: 2.75, alpha: 0.5 };
  return { r: 2, alpha: 0.35 };
}

export const textWidth = (text: string): number => measureText(text) ?? text.length * FALLBACK_CHAR_PX;

export const shortName = (name: string): string =>
  name.length > LABEL_CHARS ? `${name.slice(0, LABEL_CHARS - 1).trimEnd()}…` : name;

export function tipShift(y: number, height: number): string {
  if (y < TIP_EDGE) return "0%";
  return y > height - TIP_EDGE ? "-100%" : "-50%";
}

export const tipFlips = (x: number, width: number): boolean => x > width - TIP_WIDTH;
