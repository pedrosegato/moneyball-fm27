import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { MAX_FOLDER_NAME } from "@/store/shortlist";

interface FolderNameFieldProps {
  label: string;
  initial: string;
  onDone(name: string | null): void;
}

export function FolderNameField({ label, initial, onDone }: FolderNameFieldProps) {
  const { t } = useTranslation("cart");
  const [name, setName] = useState(initial);
  const answered = useRef(false);
  const finish = (value: string | null) => {
    if (answered.current) return;
    answered.current = true;
    onDone(value);
  };
  return (
    <Input
      aria-label={label}
      autoFocus
      value={name}
      maxLength={MAX_FOLDER_NAME}
      placeholder={t("folders.namePlaceholder")}
      className="h-7"
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setName(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.nativeEvent.isComposing) finish(name);
        else if (e.key === "Escape") {
          e.stopPropagation();
          finish(null);
        }
      }}
      onBlur={() => finish(name)}
    />
  );
}
