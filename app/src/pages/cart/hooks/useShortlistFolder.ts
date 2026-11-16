import { useMemo, useState } from "react";
import type { PlayerRecord } from "@/data/types";
import type { ShortlistFolder } from "@/store/shortlist";
import { useStableRows } from "@/table/lib/rows";

export function useShortlistFolder(folders: readonly ShortlistFolder[], players: readonly PlayerRecord[] | undefined) {
  const [chosen, setChosen] = useState<string | null>(null);
  const folder = folders.find((f) => f.id === chosen) ?? folders[0];
  const indexOf = useMemo(() => new Map(players?.map((p, i) => [p.uid, i])), [players]);
  const { found, missing } = useMemo(() => {
    const at: number[] = [];
    const gone: number[] = [];
    for (const uid of folder.uids) {
      const i = indexOf.get(uid);
      if (i === undefined) gone.push(uid);
      else at.push(i);
    }
    return { found: Uint32Array.from(at), missing: gone };
  }, [folder.uids, indexOf]);
  const rows = useStableRows(found);
  return { folder, choose: setChosen, rows, missing };
}
