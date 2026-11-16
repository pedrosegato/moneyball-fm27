import { cn } from "@/lib/utils";
import type { CartStatus } from "@/store/cart";
import { statusHint, statusLabel, statusLook } from "../lib/cartStatus";

export function StatusChip({ status }: { status: CartStatus }) {
  const { icon: Icon, className } = statusLook(status);
  return (
    <span
      title={statusHint(status)}
      className={cn(
        "inline-flex h-[1.375rem] items-center gap-1 rounded-md border px-1.5 type-label whitespace-nowrap",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {statusLabel(status)}
    </span>
  );
}
