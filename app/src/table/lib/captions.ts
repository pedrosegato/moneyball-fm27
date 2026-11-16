import { STAT_GROUPS } from "@/engine/stats/groups";
import { LOCALE } from "@/lib/constants";
import { measureText } from "@/lib/measureText";
import { COLUMN_GROUP } from "../columns/ids";
import type { ColumnGroup } from "../columns/types";

const FONT_PX = 11;
const TRACKING_EM = 0.01;
const FALLBACK_CHAR_PX = 7.6;

const UNCAPTIONED: ReadonlySet<string> = new Set([COLUMN_GROUP.contract, COLUMN_GROUP.attributes]);

const CAPTIONED = new Map<string, { label: string; short: string }>(
  STAT_GROUPS.filter((g) => !UNCAPTIONED.has(g.id)).map((g) => [g.id, { label: g.label, short: g.short }]),
);

const widths = new Map<string, number>();

function captionWidth(text: string): number {
  let width = widths.get(text);
  if (width !== undefined) return width;
  const upper = text.toLocaleUpperCase(LOCALE);
  const measured = measureText(upper);
  width = measured === null ? upper.length * FALLBACK_CHAR_PX : measured + upper.length * TRACKING_EM * FONT_PX;
  widths.set(text, width);
  return width;
}

export function groupCaption(group: ColumnGroup, width: number): string | undefined {
  const caption = CAPTIONED.get(group);
  if (!caption) return undefined;
  return captionWidth(caption.label) <= width ? caption.label : caption.short;
}
