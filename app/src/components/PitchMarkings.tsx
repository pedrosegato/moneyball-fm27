export function PitchMarkings() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      <span className="absolute inset-x-0 top-1/2 h-px bg-line-subtle" />
      <span className="absolute top-1/2 left-1/2 aspect-square h-[21%] -translate-1/2 rounded-full border border-line-subtle" />
      <span className="absolute inset-x-[30%] top-0 h-[9%] rounded-b-sm border border-t-0 border-line-subtle" />
      <span className="absolute inset-x-[30%] bottom-0 h-[9%] rounded-t-sm border border-b-0 border-line-subtle" />
    </div>
  );
}
