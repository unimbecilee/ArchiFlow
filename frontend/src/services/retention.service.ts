import api from "@/lib/api";

export type RetentionPolicy = {
  id: number;
  name: string;
  duration_years: number;
  classification?: string;
};

export async function listRetentionPolicies(): Promise<RetentionPolicy[]> {
  const res = await api.get<{ success: boolean; data: RetentionPolicy[] }>(
    "/api/admin/retention-policies"
  );
  return res.data.data ?? [];
}

export async function createRetentionPolicy(data: {
  name: string;
  duration_years: number;
  classification?: string;
}): Promise<RetentionPolicy> {
  const res = await api.post<{ success: boolean; data: RetentionPolicy }>(
    "/api/admin/retention-policies",
    data
  );
  return res.data.data;
}
