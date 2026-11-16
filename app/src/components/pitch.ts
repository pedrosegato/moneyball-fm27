import type { POS_NAMES } from "@/engine/positions";

export type PitchPosition = (typeof POS_NAMES)[number];
export type PitchLevel = "natural" | "secundaria";

export const POSITION_LABEL: Record<PitchPosition, string> = {
  GK: "Goleiro",
  SW: "Líbero",
  DL: "Lateral esquerdo",
  DC: "Zagueiro",
  DR: "Lateral direito",
  WBL: "Ala esquerdo",
  DM: "Volante",
  WBR: "Ala direito",
  ML: "Meia esquerda",
  MC: "Meio-campista",
  MR: "Meia direita",
  AML: "Ponta esquerda",
  AMC: "Meia ofensivo",
  AMR: "Ponta direita",
  ST: "Atacante",
};

export const SLOT_BASE =
  "flex h-6 items-center justify-center gap-1.5 rounded-md px-1.5 type-caption tabular-nums whitespace-nowrap";
export const SLOT_ON = "bg-primary text-primary-foreground";
export const SLOT_SECONDARY = "bg-surface-active text-fg ring-1 ring-line-strong ring-inset";
export const SLOT_OFF = "border border-dashed border-line text-fg-muted";

export function keyedByText(texts: readonly string[]): { key: string; text: string }[] {
  const seen = new Map<string, number>();
  return texts.map((text) => {
    const n = (seen.get(text) ?? 0) + 1;
    seen.set(text, n);
    return { key: `${n}:${text}`, text };
  });
}

export const PITCH_SLOT: Record<PitchPosition, readonly [number, number]> = {
  ST: [2, 1],
  AML: [1, 2],
  AMC: [2, 2],
  AMR: [3, 2],
  ML: [1, 3],
  MC: [2, 3],
  MR: [3, 3],
  WBL: [1, 4],
  DM: [2, 4],
  WBR: [3, 4],
  DL: [1, 5],
  DC: [2, 5],
  DR: [3, 5],
  SW: [2, 6],
  GK: [2, 7],
};
