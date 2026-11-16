import { useBusy } from "@/store/useData";

export function TableBusyBar() {
  const analyzing = useBusy();
  if (!analyzing) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 -bottom-px h-0.5 overflow-hidden">
      <div data-busy-bar className="h-full w-1/4 bg-primary" />
    </div>
  );
}
