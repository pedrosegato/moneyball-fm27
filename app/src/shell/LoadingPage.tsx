import { Page } from "@/components/Page";
import { SkeletonRows } from "./SkeletonRows";

export function LoadingPage({ label }: { label: string }) {
  return (
    <Page aria-busy="true" className="overflow-hidden">
      <div className="sr-only" role="status">
        {label}
      </div>
      <SkeletonRows />
    </Page>
  );
}
