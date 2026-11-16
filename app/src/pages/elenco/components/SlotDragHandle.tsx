import type { DragHandleProps } from "../hooks/useLineupDrag";

interface SlotDragHandleProps {
  handle: DragHandleProps;
  label: string;
  empty: boolean;
  tabbable: boolean;
  onClick(): void;
}

export function SlotDragHandle({ handle, label, empty, tabbable, onClick }: SlotDragHandleProps) {
  return (
    <button
      type="button"
      {...handle}
      tabIndex={tabbable && !empty ? 0 : -1}
      aria-label={label}
      onClick={onClick}
      className="pointer-events-none absolute inset-0 rounded-lg opacity-0 focus-ring focus-visible:opacity-100"
    />
  );
}
