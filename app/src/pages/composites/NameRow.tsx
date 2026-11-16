import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { Composite } from "@/engine/composites";
import { nameProblem } from "@/store/compositeRules";
import { NameField } from "./NameField";

interface NameRowProps {
  value: Composite;
  isNew: boolean;
  others: readonly Composite[];
  onChange(label: string): void;
}

export function NameRow({ value, isNew, others, onChange }: NameRowProps) {
  const { t } = useTranslation("settings");
  const nameId = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={nameId} className="type-label text-fg">
        {t("composites.name.label")}
      </label>
      <NameField
        id={nameId}
        value={value.label}
        live={isNew}
        invalid={!isNew && nameProblem(value.label, others) !== null}
        onChange={onChange}
      />
    </div>
  );
}
