import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { Composite } from "@/engine/composites";
import { CUSTOM_RULES } from "@/store/compositeRules";
import { COMPOSITE_ROLE, type Entry, RULES } from "./entries";
import { FormActions } from "./FormActions";
import { sameWeights, statOptions } from "./model";
import { NameRow } from "./NameRow";
import { Note } from "./Note";
import { Preview } from "./Preview";
import { ProblemLine } from "./ProblemLine";
import { StatAdder } from "./StatAdder";
import { useCompositeEdit } from "./useCompositeEdit";
import { WeightsTable } from "./WeightsTable";

interface CompositeFormProps {
  entry: Entry;
  others: readonly Composite[];
  onSave(c: Composite): void;
  onCreate?(c: Composite): void;
  onRestore?(): void;
  onDelete?(): void;
}

export function CompositeForm({ entry, others, onSave, onCreate, onRestore, onDelete }: CompositeFormProps) {
  const { t } = useTranslation("settings");
  const headingId = useId();
  const isNew = onCreate !== undefined;
  const rules = RULES[entry.role];
  const edit = useCompositeEdit(entry.composite, rules, others, onSave);
  const { value, problem } = edit;
  const stats = Object.keys(value.weights).length;
  const restorable = !!entry.preset && !sameWeights(entry.composite.weights, entry.preset.weights);
  const title = isNew ? t("composites.form.newTitle") : value.label || entry.composite.label;
  const custom = entry.role === COMPOSITE_ROLE.custom;
  const kindRole = value.kind === "weightedSum" ? COMPOSITE_ROLE.actions : entry.role;

  return (
    <>
      <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-4">
        <header className="flex flex-col gap-1.5">
          <h2 id={headingId} className="truncate type-heading text-fg" title={title}>
            {custom ? title : entry.composite.label}
          </h2>
          <p className="type-caption text-fg-muted">{t(`composites.kind.${kindRole}`)}</p>
        </header>

        {custom && (
          <NameRow value={value} isNew={isNew} others={others} onChange={(label) => edit.change({ ...value, label })} />
        )}

        <div className="flex flex-col gap-2">
          <WeightsTable composite={value} rules={rules} onChange={(weights) => edit.change({ ...value, weights })} />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <StatAdder
              options={statOptions(value)}
              disabled={stats >= rules.maxStats}
              onAdd={(key) => edit.change({ ...value, weights: { ...value.weights, [key]: 1 } })}
            />
            <span className="type-caption tabular-nums text-fg-faint">
              {t("composites.form.statCount", { count: stats })}
              {custom && t("composites.form.statRange", { min: CUSTOM_RULES.minStats, max: CUSTOM_RULES.maxStats })}
            </span>
          </div>
          <ProblemLine problem={problem} isNew={isNew} />
        </div>

        <Note>{t("composites.note.coverage")}</Note>

        <FormActions
          value={value}
          problem={problem}
          restorable={restorable}
          onCreate={onCreate}
          onRestore={onRestore}
          onDelete={onDelete}
        />
      </section>
      <Preview composite={value} />
    </>
  );
}
