import type { ReactNode } from "react";
import type { PlayerRecord } from "@/data/types";

export interface SelectionContext {
  players: readonly PlayerRecord[];
  clear(): void;
}

export interface PageAction {
  id: string;
  render(selection: SelectionContext): ReactNode;
}

export const SELECTION_ACTION = {
  cart: "cart",
  shortlist: "shortlist",
  compare: "compare",
  profile: "profile",
} as const;
export type BuiltInAction = (typeof SELECTION_ACTION)[keyof typeof SELECTION_ACTION];

export type SelectionAction = BuiltInAction | PageAction;
