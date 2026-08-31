"use client";

import { ListSkeleton } from "@/components/layout/list-skeleton";

export default function LoadingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ListSkeleton rows={12} />
    </div>
  );
}