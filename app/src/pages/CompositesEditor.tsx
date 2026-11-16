import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Composite } from "@/engine/composites";
import { MAX_CUSTOM_COMPOSITES } from "@/store/compositeRules";
import { allComposites } from "@/store/composites";
import { useAppStore } from "@/store/index";
import { CompositeNav } from "./composites/CompositeNav";
import { DeleteDialog } from "./composites/DeleteDialog";
import { EditorForm } from "./composites/EditorForm";
import { COMPOSITE_ROLE, type Entry } from "./composites/entries";
import { blankComposite, NEW_ITEM } from "./composites/model";
import { useCompositeEntries } from "./composites/useCompositeEntries";

export function CompositesEditor({ item }: { item?: string }) {
  const { t } = useTranslation("settings");
  const entries = useCompositeEntries();
  const composites = useAppStore((s) => s.composites);
  const [newDraft, setNewDraft] = useState<Composite>(blankComposite);
  const [deleting, setDeleting] = useState<Composite | null>(null);

  const creating = item === NEW_ITEM && composites.custom.length < MAX_CUSTOM_COMPOSITES;
  const entry: Entry = creating
    ? { role: COMPOSITE_ROLE.custom, composite: newDraft, name: t("composites.form.newTitle") }
    : (entries.find((e) => e.composite.id === item) ?? entries[0]);
  const id = entry.composite.id;
  const others = allComposites(composites).filter((c) => c.id !== id);

  return (
    <div className="flex min-h-0 flex-1">
      <CompositeNav entries={entries} current={creating ? NEW_ITEM : id} />
      <div className="@container min-h-0 flex-1 overflow-y-auto">
        <div className="grid max-w-[64rem] gap-6 px-6 py-5 @3xl:grid-cols-[minmax(0,1fr)_17rem] @3xl:items-start">
          <EditorForm entry={entry} creating={creating} others={others} onDraft={setNewDraft} onDelete={setDeleting} />
        </div>
      </div>
      <DeleteDialog composite={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
