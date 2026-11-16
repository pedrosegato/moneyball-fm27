import { CriteriaPopover } from "@/components/CriteriaPopover";
import { DEFAULT_ENGINE_SETTINGS } from "@/engine/analysis/input";
import { useAppStore } from "@/store/index";
import { sameCriteria } from "../lib/moneyball";
import { MoneyballControls } from "./MoneyballControls";

export function MoneyballCriteria() {
  const changed = useAppStore((s) => !sameCriteria(s.settings.engine.moneyball, DEFAULT_ENGINE_SETTINGS.moneyball));
  return (
    <CriteriaPopover changed={changed}>
      <MoneyballControls />
    </CriteriaPopover>
  );
}
