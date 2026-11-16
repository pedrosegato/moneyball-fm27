import { FolderMinus } from "lucide-react";
import { useMemo } from "react";
import { cartT } from "@/cart/lib/cartT";
import { appStore } from "@/store/index";
import type { ShortlistFolder } from "@/store/shortlist";
import { ActionButton } from "@/table/components/ActionButton";
import type { SelectionAction } from "@/table/lib/selectionActions";
import { MoveToFolder } from "../components/MoveToFolder";

export function useShortlistActions(folderId: string, folders: readonly ShortlistFolder[]) {
  return useMemo<readonly SelectionAction[]>(
    () => [
      "cart",
      {
        id: "move",
        render: ({ players, clear }) => (
          <MoveToFolder players={players} from={folderId} folders={folders} clear={clear} />
        ),
      },
      {
        id: "remove",
        render: ({ players, clear }) => (
          <ActionButton
            icon={FolderMinus}
            label={cartT("shortlistPage.remove")}
            hint={cartT("shortlistPage.removeHint", { count: players.length })}
            onClick={() => {
              appStore.getState().removeFromFolder(
                players.map((p) => p.uid),
                folderId,
              );
              clear();
            }}
          />
        ),
      },
      "compare",
      "profile",
    ],
    [folderId, folders],
  );
}
