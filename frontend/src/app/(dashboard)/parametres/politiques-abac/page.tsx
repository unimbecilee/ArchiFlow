"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AccessPoliciesSettings } from "@/components/settings/access-policies-settings";
import { canManageAccessPolicies } from "@/lib/settings-access";
import { useAuthStore } from "@/store/auth-store";
import { ListSkeleton } from "@/components/layout/list-skeleton";

export default function ParametresPolitiquesAbacPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user && !canManageAccessPolicies(user)) {
      router.replace("/parametres/compte");
    }
  }, [user, router]);

  if (!user) return <ListSkeleton rows={4} />;
  if (!canManageAccessPolicies(user)) return null;

  return <AccessPoliciesSettings />;
}
