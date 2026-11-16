import { useTranslation } from "react-i18next";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCount } from "@/lib/format";
import { ELENCO_TAB, type ElencoTab } from "@/store/ui";
import { TAB_PANEL_ID, tabId } from "../lib/tabs";

const TABS = Object.values(ELENCO_TAB);

interface SlotTabsProps {
  tab: ElencoTab;
  onTab(tab: ElencoTab): void;
  counts: Record<ElencoTab, number>;
}

export function SlotTabs({ tab, onTab, counts }: SlotTabsProps) {
  const { t } = useTranslation("elenco");
  return (
    <Tabs value={tab} onValueChange={(next) => onTab(next as ElencoTab)} className="gap-0">
      <TabsList variant="line" aria-label={t("slotHead.tabs")} className="-mb-px h-9 gap-5 p-0">
        {TABS.map((id) => (
          <TabsTrigger
            key={id}
            value={id}
            id={tabId(id)}
            aria-controls={TAB_PANEL_ID}
            className="h-full flex-none rounded-none px-0.5 after:inset-x-0 after:bottom-0 after:h-0.5 data-active:after:opacity-100"
          >
            {t(`tab.${id}`)} <span className="tabular-nums text-fg-faint">{formatCount(counts[id])}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
