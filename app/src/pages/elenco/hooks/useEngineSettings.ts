import { useShallow } from "zustand/react/shallow";
import type { EngineSettings } from "@/engine/analysis/input";
import { appStore, useAppStore } from "@/store/index";

export function useEngineSettings<K extends "fit" | "sellKeep">(section: K) {
  const { options, poolMinutes, updateSettings } = useAppStore(
    useShallow((s) => ({
      options: s.settings.engine[section],
      poolMinutes: s.settings.engine.poolMinutes,
      updateSettings: s.updateSettings,
    })),
  );
  const engine = () => appStore.getState().settings.engine;
  const update = (patch: Partial<EngineSettings>) => updateSettings({ engine: { ...engine(), ...patch } });
  const set = (patch: Partial<EngineSettings[K]>) => update({ [section]: { ...engine()[section], ...patch } });
  return { options, poolMinutes, engine, update, set };
}
