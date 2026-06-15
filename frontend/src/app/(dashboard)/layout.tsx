"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArchiFlowShell } from "@/components/layout/archiflow-shell";
import { useAuthStore } from "@/store/auth-store";

function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-8 px-0 md:pl-4 lg:pl-8">
      <div className="space-y-4">
        <div className="h-4 w-28 animate-shimmer rounded-full" />
        <motion.div className="h-12 w-2/3 max-w-xl animate-shimmer rounded-2xl" />
        <div className="h-5 w-full max-w-lg animate-shimmer rounded-xl" />
      </div>
      <div className="grid gap-6 md:grid-cols-[2fr_1fr_1fr]">
        <div className="surface-bento h-56 animate-shimmer md:col-span-2" />
        <motion.div className="surface-bento h-56 animate-shimmer" />
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
      <div className="page-atmosphere flex min-h-[100dvh] items-center justify-center bg-[#f9fafb]">
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
