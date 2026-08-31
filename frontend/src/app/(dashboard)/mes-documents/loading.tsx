import { SkeletonDocuments, SkeletonStats } from "@/components/states";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <SkeletonStats />
      <SkeletonDocuments rows={8} />
    </div>
  );
}
