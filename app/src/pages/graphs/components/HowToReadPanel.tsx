import { Collapsible } from "@base-ui/react/collapsible";
import { MoveRight, MoveUp, MoveUpRight, Palette } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Axis } from "../lib/scatter";
import { AxisDirection } from "./AxisDirection";
import { HowToReadLine } from "./HowToReadLine";

export function HowToReadPanel({ x, y }: { x: Axis; y: Axis }) {
  const { t } = useTranslation("graphs");
  return (
    <Collapsible.Panel
      role="region"
      aria-label={t("howToRead.title")}
      className="@container mx-4 mt-2 rounded-lg border border-line-subtle bg-surface-raised px-3 py-2 transition-opacity duration-(--duration-quick) ease-out data-ending-style:opacity-0 data-ending-style:duration-(--duration-press) data-starting-style:opacity-0 motion-reduce:transition-none"
    >
      <ul className="grid gap-x-6 gap-y-1 type-label text-fg-secondary @[52rem]:grid-cols-2">
        <HowToReadLine icon={MoveRight}>
          <AxisDirection where={t("howToRead.right")} axis={x} />
        </HowToReadLine>
        <HowToReadLine icon={MoveUp}>
          <AxisDirection where={t("howToRead.up")} axis={y} />
        </HowToReadLine>
        <HowToReadLine icon={MoveUpRight}>{t("howToRead.corners")}</HowToReadLine>
        <HowToReadLine icon={Palette}>{t("howToRead.colours")}</HowToReadLine>
      </ul>
    </Collapsible.Panel>
  );
}
