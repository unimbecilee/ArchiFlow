import { SkeletonDocuments } from "@/components/states";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl">
      <SkeletonDocuments rows={8} />
    </div>
  );
}
