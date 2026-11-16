import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { PopoverDescription, PopoverTitle } from "@/components/ui/popover";
import { useTableFilter } from "../hooks/useTableFilter";
import type { EditorRequest, FilterData } from "../lib/editor";
import { ColumnFilterEditor } from "./ColumnFilterEditor";

interface FilterEditorBodyProps {
  request: EditorRequest;
  data: FilterData;
  onClose(): void;
}

export function FilterEditorBody({ request, data, onClose }: FilterEditorBodyProps) {
  const { t } = useTranslation("filters");
  const { target, table } = request;
  const [filter, setFilter] = useTableFilter(table, target.col);
  return (
    <>
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <PopoverTitle className="truncate type-label">
            {target.column.label}
            {target.percentile && <span className="text-fg-muted"> {t("editor.percentile")}</span>}
          </PopoverTitle>
          <PopoverDescription className="type-caption">{t("editor.hint")}</PopoverDescription>
        </div>
        {filter && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              setFilter(null);
              onClose();
            }}
          >
            {t("remove", { ns: "common" })}
          </Button>
        )}
      </div>
      <ColumnFilterEditor target={target} filter={filter} data={data} onChange={setFilter} />
    </>
  );
}
