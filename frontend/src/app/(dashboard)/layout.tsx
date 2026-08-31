"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArchiFlowShell } from "@/components/layout/archiflow-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/auth-store";

function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-10">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-80" />
      <div className="grid gap-3 md:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, checkAuth, isInitializing } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isInitializing, router]);

  useEffect(() => {
    if (!isInitializing && isAuthenticated && user?.must_change_password) {
      if (pathname !== "/changer-mot-de-passe") {
        router.replace("/changer-mot-de-passe");
      }
    }
  }, [isInitializing, isAuthenticated, user, pathname, router]);

  if (isInitializing) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <LoadingSkeleton />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (pathname === "/changer-mot-de-passe") {
    return <>{children}</>;
  }

  return <ArchiFlowShell>{children}</ArchiFlowShell>;
}
