import { useShallow } from "zustand/react/shallow";
import type { Composite } from "@/engine/composites";
import { useAppStore } from "@/store/index";
import { CompositeForm } from "./CompositeForm";
import { COMPOSITE_ROLE, type Entry } from "./entries";
import { goToComposite } from "./links";
import { blankComposite, NEW_ITEM } from "./model";

interface EditorFormProps {
  entry: Entry;
  creating: boolean;
  others: readonly Composite[];
  onDraft(c: Composite): void;
  onDelete(c: Composite): void;
}

export function EditorForm({ entry, creating, others, onDraft, onDelete }: EditorFormProps) {
  const actions = useAppStore(
    useShallow((s) => ({
      setCompositeWeights: s.setCompositeWeights,
      resetComposite: s.resetComposite,
      addCustomComposite: s.addCustomComposite,
      updateCustomComposite: s.updateCustomComposite,
    })),
  );
  const id = entry.composite.id;

  if (creating) {
    return (
      <CompositeForm
        key={NEW_ITEM}
        entry={entry}
        others={others}
        onSave={onDraft}
        onCreate={(c) => {
          const created = actions.addCustomComposite(c.label, c.weights);
          if (!created) return;
          onDraft(blankComposite());
          goToComposite(created);
        }}
      />
    );
  }
  if (entry.role === COMPOSITE_ROLE.custom) {
    return (
      <CompositeForm
        key={id}
        entry={entry}
        others={others}
        onSave={(c) => actions.updateCustomComposite(id, { label: c.label, weights: c.weights })}
        onDelete={() => onDelete(entry.composite)}
      />
    );
  }
  return (
    <CompositeForm
      key={id}
      entry={entry}
      others={others}
      onSave={(c) => actions.setCompositeWeights(id, c.weights)}
      onRestore={() => actions.resetComposite(id)}
    />
  );
}
