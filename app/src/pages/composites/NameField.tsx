import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { useDraftInput } from "@/hooks/useDraftInput";
import { MAX_COMPOSITE_LABEL } from "@/store/compositeRules";

interface NameFieldProps {
  id: string;
  value: string;
  live: boolean;
  invalid: boolean;
  onChange(label: string): void;
}

export function NameField({ id, value, live, invalid, onChange }: NameFieldProps) {
  const { t } = useTranslation("settings");
  const { inputProps } = useDraftInput({
    shown: value,
    accept: (text) => {
      if (text !== value) onChange(text);
      return true;
    },
  });
  return (
    <Input
      id={id}
      aria-label={t("composites.name.aria")}
      aria-invalid={invalid || undefined}
      placeholder={t("composites.name.placeholder")}
      autoComplete="off"
      spellCheck={false}
      maxLength={MAX_COMPOSITE_LABEL}
      {...inputProps}
      onChange={(e) => (live ? onChange(e.target.value) : inputProps.onChange(e))}
      className="h-8 max-w-80"
    />
  );
}
