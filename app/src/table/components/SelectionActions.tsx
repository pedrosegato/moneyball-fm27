import { type ComponentType, Fragment } from "react";
import type { BuiltInAction, SelectionAction, SelectionContext } from "../lib/selectionActions";
import { CartActions } from "./CartActions";
import { CompareAction } from "./CompareAction";
import { ProfileAction } from "./ProfileAction";
import { ShortlistAction } from "./ShortlistAction";

const BUILT_IN: Readonly<Record<BuiltInAction, ComponentType<SelectionContext>>> = {
  cart: CartActions,
  shortlist: ShortlistAction,
  compare: CompareAction,
  profile: ProfileAction,
};

interface SelectionActionsProps {
  actions: readonly SelectionAction[];
  selection: SelectionContext;
}

export function SelectionActions({ actions, selection }: SelectionActionsProps) {
  return (
    <>
      {actions.map((action) => {
        if (typeof action !== "string") return <Fragment key={action.id}>{action.render(selection)}</Fragment>;
        const Action = BUILT_IN[action];
        return <Action key={action} {...selection} />;
      })}
    </>
  );
}
