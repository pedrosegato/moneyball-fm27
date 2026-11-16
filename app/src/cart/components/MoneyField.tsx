import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { useDraftInput } from "@/hooks/useDraftInput";
import { formatMoney, formatWage, moneyExample, parseMoney, parseWage } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useMoney } from "@/store/index";
import { cartT } from "../lib/cartT";

interface MoneyFieldProps {
  name: string;
  value: number | null;
  wage?: boolean;
  clearable?: boolean;
  placeholder?: string;
  suffix?: string;
  quiet?: boolean;
  disabled?: boolean;
  tabIndex?: number;
  className?: string;
  onCommit(value: number | null): void;
}

export function MoneyField({
  name,
  value,
  wage = false,
  clearable = false,
  placeholder,
  suffix,
  quiet = false,
  disabled,
  tabIndex,
  className,
  onCommit,
}: MoneyFieldProps) {
  const money = useMoney();
  const [format, parse] = wage ? [formatWage, parseWage] : [formatMoney, parseMoney];
  const { invalid, inputProps } = useDraftInput({
    shown: value === null ? "" : format(value, money),
    accept: (text) => {
      const next = text.trim() === "" && clearable ? null : parse(text, money);
      if (next !== null && Number.isNaN(next)) return false;
      if (next !== value) onCommit(next);
      return true;
    },
  });

  return (
    <InputGroup
      className={cn("h-7 w-auto", quiet && "border-transparent", className)}
      data-disabled={disabled || undefined}
    >
      <InputGroupInput
        aria-label={name}
        aria-invalid={invalid || undefined}
        title={invalid ? cartT("moneyField.invalid", { example: moneyExample(money) }) : undefined}
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        tabIndex={tabIndex}
        placeholder={placeholder}
        {...inputProps}
        onFocus={(e) => e.currentTarget.select()}
        className="h-full min-w-0 px-2 text-right tabular-nums"
      />
      {suffix && (
        <InputGroupAddon align="inline-end" className="pl-0 text-fg-faint">
          {suffix}
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}
