"use client";

import { ListSkeleton } from "@/components/layout/list-skeleton";

export default function LoadingPage() {
  return (
    <div className="min-h-screen bg-background">
      <ListSkeleton rows={12} />
    </div>
  );
}