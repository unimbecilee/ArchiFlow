import api from "@/lib/api";

type FeatureFlags = Record<string, boolean>;

let cachedFlags: FeatureFlags | null = null;

export async function fetchFeatureFlags(): Promise<FeatureFlags> {
  if (cachedFlags) return cachedFlags;
  try {
    const res = await api.get("/admin/feature-flags");
    const flags = (res.data?.data as FeatureFlags) || {};
    cachedFlags = flags;
    return flags;
  } catch {
    cachedFlags = {};
    return cachedFlags;
  }
}

export function isFeatureEnabled(flags: FeatureFlags, name: string): boolean {
  return !!flags[name];
}

export function useFeatureFlags(): FeatureFlags {
  return cachedFlags || {};
}

export function clearFeatureFlagsCache(): void {
  cachedFlags = null;
}
