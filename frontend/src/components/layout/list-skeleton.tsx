import { SkeletonDocuments } from "@/components/states";

export function ListSkeleton({ rows = 8 }: { rows?: number }) {
  return <SkeletonDocuments rows={rows} />;
}
