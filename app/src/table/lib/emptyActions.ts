import type { EmptyAction } from "../components/TableEmpty";

export const presentActions = (ways: readonly (EmptyAction | false | null)[]): EmptyAction[] =>
  ways.filter((way): way is EmptyAction => !!way);
