import { Page } from "@/components/Page";
import { SkeletonRows } from "./SkeletonRows";

export function PageChunkLoading() {
  return (
    <Page aria-busy="true" data-delayed className="overflow-hidden pt-10">
      <SkeletonRows />
    </Page>
  );
}
