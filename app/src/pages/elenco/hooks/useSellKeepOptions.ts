import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import type { SellKeepOptions } from "@/engine/sellKeep";
import { useAppStore } from "@/store/index";

export function useSellKeepOptions(): SellKeepOptions {
  const { pooled, poolMinutes } = useAppStore(
    useShallow((s) => ({ pooled: s.settings.engine.sellKeep, poolMinutes: s.settings.engine.poolMinutes })),
  );
  return useMemo(() => ({ ...pooled, poolMinutes }), [pooled, poolMinutes]);
}
