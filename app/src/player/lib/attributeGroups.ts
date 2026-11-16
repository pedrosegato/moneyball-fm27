import { hasAttributes } from "@/engine/ability";
import { ATTRIBUTE_NAMES, type AttributeName } from "@/engine/data/attributes";
import { i18n } from "@/i18n";
import { compareText } from "@/lib/text";

const TECHNICAL: readonly AttributeName[] = [
  "Corners",
  "Crossing",
  "Dribbling",
  "Finishing",
  "First Touch",
  "Free Kick Taking",
  "Heading",
  "Long Shots",
  "Long Throws",
  "Marking",
  "Passing",
  "Penalty Taking",
  "Tackling",
  "Technique",
];
const MENTAL: readonly AttributeName[] = [
  "Aggression",
  "Anticipation",
  "Bravery",
  "Composure",
  "Concentration",
  "Decisions",
  "Determination",
  "Flair",
  "Leadership",
  "Off The Ball",
  "Positioning",
  "Teamwork",
  "Vision",
  "Work Rate",
];
const PHYSICAL: readonly AttributeName[] = [
  "Acceleration",
  "Agility",
  "Balance",
  "Jumping Reach",
  "Natural Fitness",
  "Pace",
  "Stamina",
  "Strength",
];
const GOALKEEPING: readonly AttributeName[] = [
  "Aerial Reach",
  "Command Of Area",
  "Communication",
  "Eccentricity",
  "First Touch",
  "Handling",
  "Kicking",
  "One On Ones",
  "Passing",
  "Punching",
  "Reflexes",
  "Rushing Out",
  "Throwing",
];

export interface AttributeItem {
  name: AttributeName;
  label: string;
  value: number;
}

export interface AttributeGroup {
  id: string;
  label: string;
  items: AttributeItem[];
}

const ATTRIBUTE_SET = {
  technical: "tecnicos",
  mental: "mentais",
  physical: "fisicos",
  goalkeeping: "goleiro",
} as const;
type AttributeSetId = (typeof ATTRIBUTE_SET)[keyof typeof ATTRIBUTE_SET];

const OUTFIELD_SETS: readonly (readonly [AttributeSetId, readonly AttributeName[]])[] = [
  [ATTRIBUTE_SET.technical, TECHNICAL],
  [ATTRIBUTE_SET.mental, MENTAL],
  [ATTRIBUTE_SET.physical, PHYSICAL],
];
const KEEPER_SETS: typeof OUTFIELD_SETS = [[ATTRIBUTE_SET.goalkeeping, GOALKEEPING], ...OUTFIELD_SETS.slice(1)];

const attributeLabel = (name: AttributeName): string => i18n.t(`player:attributes.name.${name}`);

const onGameScale = (stored: number) => Math.min(20, Math.max(1, Math.round(stored / 5)));

export function attributeGroups(attrs: readonly number[] | null | undefined, keeper: boolean): AttributeGroup[] | null {
  if (!hasAttributes(attrs)) return null;
  return (keeper ? KEEPER_SETS : OUTFIELD_SETS).map(([id, names]) => ({
    id,
    label: i18n.t(`player:attributes.group.${id}`),
    items: names
      .map((name) => ({
        name,
        label: attributeLabel(name),
        value: onGameScale(attrs[ATTRIBUTE_NAMES.indexOf(name)]),
      }))
      .sort((a, b) => compareText(a.label, b.label)),
  }));
}

export const ATTRIBUTE_TIER = { high: "high", mid: "mid", low: "low" } as const;
export type AttributeTier = (typeof ATTRIBUTE_TIER)[keyof typeof ATTRIBUTE_TIER];

export function attributeTier(value: number): AttributeTier {
  if (value >= 15) return ATTRIBUTE_TIER.high;
  return value <= 8 ? ATTRIBUTE_TIER.low : ATTRIBUTE_TIER.mid;
}
