import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { PitchMap } from "@/components/PitchMap";
import type { PlayerRecord } from "@/data/types";
import { cartPitch } from "../lib/cartPitch";
import type { ReconciledItem } from "../lib/reconcile";

interface CartPitchProps {
  lines: readonly ReconciledItem[];
  players: readonly PlayerRecord[];
}

export function CartPitch({ lines, players }: CartPitchProps) {
  const { t } = useTranslation("cart");
  const { counts, names, arrivals } = useMemo(() => cartPitch(lines, players), [lines, players]);
  const label = t("pitch.label");
  return (
    <section aria-labelledby="cart-pitch" className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="cart-pitch" className="type-label text-fg-secondary">
          {label}
        </h2>
        <span className="type-caption tabular-nums text-fg-muted">{t("pitch.arrivals", { count: arrivals })}</span>
      </div>
      <PitchMap mode="counts" counts={counts} names={names} label={label} className="self-center" />
      <p className="type-caption text-fg-muted">{t("pitch.note")}</p>
    </section>
  );
}
