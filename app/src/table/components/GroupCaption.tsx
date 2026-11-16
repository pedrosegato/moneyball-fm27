export function GroupCaption({ caption, left, width }: { caption: string; left: number; width: number }) {
  return (
    <span
      aria-hidden
      data-group-caption
      className="pointer-events-none absolute top-1 z-1 truncate border-b border-line-subtle pb-px text-center type-caption text-fg-faint uppercase"
      style={{ left, width }}
    >
      {caption}
    </span>
  );
}
