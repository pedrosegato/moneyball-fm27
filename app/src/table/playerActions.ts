import { SELECTION_ACTION, type SelectionAction } from "./lib/selectionActions";

export const PLAYER_ACTIONS: readonly SelectionAction[] = [
  SELECTION_ACTION.cart,
  SELECTION_ACTION.shortlist,
  SELECTION_ACTION.compare,
  SELECTION_ACTION.profile,
];
