export const GK = "GK";

export const POS_GROUPS = [GK, "ZAG", "LAT", "VOL", "MC", "MEI", "PON", "ATA"] as const;
export type PosGroup = (typeof POS_GROUPS)[number];
export const GK_INDEX = POS_GROUPS.indexOf(GK);
export type LegacyGroup = "GK" | "DEF" | "MID" | "AM" | "ST";

export const POS_NAMES = [
  "GK",
  "SW",
  "DL",
  "DC",
  "DR",
  "DM",
  "ML",
  "MC",
  "MR",
  "AML",
  "AMC",
  "AMR",
  "ST",
  "WBL",
  "WBR",
] as const;
export type PosName = (typeof POS_NAMES)[number];

export const FIT_RATING = 15;

export const positionRating = (pos: readonly number[], position: PosName): number =>
  pos[POS_NAMES.indexOf(position)] ?? 0;

export function playsAny(pos: readonly number[], positions: readonly PosName[]): boolean {
  const needed = Math.min(FIT_RATING, Math.max(0, ...pos));
  return positions.some((position) => positionRating(pos, position) >= needed);
}

const GROUP_OF: Record<PosName, PosGroup> = {
  GK: "GK",
  SW: "ZAG",
  DC: "ZAG",
  DL: "LAT",
  DR: "LAT",
  WBL: "LAT",
  WBR: "LAT",
  DM: "VOL",
  MC: "MC",
  AMC: "MEI",
  ML: "PON",
  MR: "PON",
  AML: "PON",
  AMR: "PON",
  ST: "ATA",
};

export const positionGroup = (name: PosName): PosGroup => GROUP_OF[name];

export function positionsIn(groups: readonly PosGroup[]): (typeof POS_NAMES)[number][] {
  return POS_NAMES.filter((name) => groups.includes(GROUP_OF[name]));
}

const TIE_ORDER: readonly PosGroup[] = ["ATA", "PON", "MEI", "MC", "VOL", "LAT", "ZAG", "GK"];

function bestPerGroup(pos: number[]): Map<PosGroup, number> {
  const best = new Map<PosGroup, number>();
  POS_NAMES.forEach((name, i) => {
    const group = GROUP_OF[name];
    best.set(group, Math.max(best.get(group) ?? -Infinity, pos[i] ?? -Infinity));
  });
  return best;
}

function rankedGroups(pos: number[]): [PosGroup, number][] {
  const best = bestPerGroup(pos);
  return TIE_ORDER.map((g): [PosGroup, number] => [g, best.get(g) ?? -Infinity]).sort(
    (a, b) => b[1] - a[1] || TIE_ORDER.indexOf(a[0]) - TIE_ORDER.indexOf(b[0]),
  );
}

export function mainGroup(pos: number[]): PosGroup {
  return rankedGroups(pos)[0][0];
}

export function groupsOf(pos: number[], min = 15): PosGroup[] {
  const main = mainGroup(pos);
  return rankedGroups(pos)
    .filter(([g, rating]) => g === main || rating >= min)
    .map(([g]) => g);
}

export function naturalPositions(pos: number[], min = 18): (typeof POS_NAMES)[number][] {
  return POS_NAMES.filter((_, i) => (pos[i] ?? 0) >= min);
}

const LEGACY_POS_MAP: Record<string, LegacyGroup> = {
  GK: "GK",
  D: "DEF",
  "D/WB": "DEF",
  WB: "DEF",
  DM: "MID",
  M: "MID",
  AM: "AM",
  ST: "ST",
};

export function legacyGroup(position: string): LegacyGroup | null {
  const groups = new Set<LegacyGroup>();
  for (const token of (position ?? "").split(",")) {
    const group = LEGACY_POS_MAP[token.replace(/\(.*\)/, "").trim()];
    if (group) groups.add(group);
  }
  return groups.has("GK") ? "GK" : (groups.values().next().value ?? null);
}

export function positionSet(position: string | null | undefined): Set<string> {
  const slots = new Set<string>();
  for (const token of (position ?? "").split(",")) {
    const m = /^([A-Z/]+)\s*(?:\(([RLC]+)\))?$/.exec(token.trim());
    if (!m) continue;
    for (const name of m[1].split("/")) {
      if (m[2]) for (const side of m[2]) slots.add(`${name}(${side})`);
      else slots.add(name);
    }
  }
  return slots;
}

export function legacySlotGroup(slot: string): LegacyGroup | null {
  const name = slot.replace(/\(.*\)/, "");
  return Object.hasOwn(LEGACY_POS_MAP, name) ? LEGACY_POS_MAP[name] : null;
}

const CENTRE_STRIKER_SLOT = "ST(C)";

export const slotCode = (slot: string): string => (slot === CENTRE_STRIKER_SLOT ? "ST" : slot.replace(/[()]/g, ""));

export function slotGroup(slot: string): PosGroup | null {
  const name = slotCode(slot);
  return Object.hasOwn(GROUP_OF, name) ? GROUP_OF[name as (typeof POS_NAMES)[number]] : null;
}
