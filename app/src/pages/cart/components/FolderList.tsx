import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { appStore } from "@/store/index";
import { MAX_FOLDERS, type ShortlistFolder } from "@/store/shortlist";
import { DeleteFolderDialog } from "./DeleteFolderDialog";
import { FolderItem } from "./FolderItem";
import { FolderNameField } from "./FolderNameField";

interface FolderListProps {
  folders: readonly ShortlistFolder[];
  selectedId: string;
  onSelect(id: string): void;
}

export function FolderList({ folders, selectedId, onSelect }: FolderListProps) {
  const { t } = useTranslation("cart");
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ShortlistFolder | null>(null);
  const last = folders.length <= 1;

  const remove = (folder: ShortlistFolder) => {
    appStore.getState().deleteFolder(folder.id);
    setDeleting(null);
  };

  return (
    <nav
      aria-label={t("folders", { ns: "common" })}
      className="flex w-56 shrink-0 flex-col gap-1 overflow-y-auto border-r border-line-subtle p-2.5"
    >
      <p className="px-2.5 pt-0.5 pb-1 type-caption text-fg-muted" aria-hidden>
        {t("folders", { ns: "common" })}
      </p>
      <ul className="flex flex-col gap-0.5">
        {folders.map((f) => (
          <li key={f.id} className="group/folder flex items-center gap-0.5">
            {renaming === f.id ? (
              <FolderNameField
                label={t("folders.rename", { name: f.name })}
                initial={f.name}
                onDone={(name) => {
                  if (name !== null) appStore.getState().renameFolder(f.id, name);
                  setRenaming(null);
                }}
              />
            ) : (
              <FolderItem
                folder={f}
                current={f.id === selectedId}
                last={last}
                onSelect={() => onSelect(f.id)}
                onRename={() => setRenaming(f.id)}
                onDelete={() => (f.uids.length ? setDeleting(f) : remove(f))}
              />
            )}
          </li>
        ))}
      </ul>
      {creating ? (
        <FolderNameField
          label={t("folders.newName")}
          initial=""
          onDone={(name) => {
            const id = name === null ? null : appStore.getState().createFolder(name);
            if (id) onSelect(id);
            setCreating(false);
          }}
        />
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className={cn("justify-start text-fg-muted", folders.length >= MAX_FOLDERS && "hidden")}
          onClick={() => setCreating(true)}
        >
          <Plus data-icon="inline-start" />
          {t("folders.create")}
        </Button>
      )}
      <DeleteFolderDialog folder={deleting} onClose={() => setDeleting(null)} onConfirm={remove} />
    </nav>
  );
}
