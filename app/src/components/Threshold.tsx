import { type ReactNode, useId } from "react";
import { useTranslation } from "react-i18next";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { useDraftInput } from "@/hooks/useDraftInput";
import { formatDecimal, formatFixed, parseDecimal } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ThresholdProps {
  label?: string;
  name: string;
  value: number;
  min?: number;
  max: number;
  decimals?: number;
  fixed?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
  hint?: string;
  className?: string;
  onCommit(value: number): void;
}

export function Threshold({
  label,
  name,
  value,
  min = 0,
  max,
  decimals = 2,
  fixed = false,
  prefix,
  suffix,
  hint,
  className,
  onCommit,
}: ThresholdProps) {
  const { t } = useTranslation();
  const id = useId();
  const { invalid, inputProps } = useDraftInput({
    shown: (fixed ? formatFixed : formatDecimal)(value, decimals),
    discardInvalidOnBlur: true,
    stopEscape: true,
    accept: (text) => {
      const next = parseDecimal(text);
      if (!(next >= min && next <= max)) return false;
      if (next !== value) onCommit(next);
      return true;
    },
  });

  return (
    <div data-threshold className={cn("flex items-center gap-1.5", className)}>
      {label && (
        <label htmlFor={id} title={hint} className="type-label whitespace-nowrap text-fg-muted">
          {label}
        </label>
      )}
      <InputGroup className="h-7 w-auto">
        {prefix && <InputGroupAddon className="pr-0 tabular-nums">{prefix}</InputGroupAddon>}
        <InputGroupInput
          id={id}
          aria-label={name}
          aria-invalid={invalid || undefined}
          title={
            invalid
              ? t("threshold.invalid", { min: formatDecimal(min, decimals), max: formatDecimal(max, decimals) })
              : undefined
          }
          inputMode="decimal"
          autoComplete="off"
          {...inputProps}
          className="h-full w-14 px-1.5 tabular-nums"
        />
        {suffix && (
          <InputGroupAddon align="inline-end" className="pl-0 tabular-nums">
            {suffix}
          </InputGroupAddon>
        )}
      </InputGroup>
    </div>
  );
}
