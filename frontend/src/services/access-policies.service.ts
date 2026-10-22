import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";

export type AccessPolicy = {
  id: number;
  name: string;
  effect: string;
  priority: number;
  condition: string;
  actions: string;
  active: boolean;
};

export type AccessPolicyInput = {
  name: string;
  effect: "allow" | "deny" | string;
  priority: number;
  condition: string;
  actions: string;
  active: boolean;
};

export async function listAccessPolicies(): Promise<AccessPolicy[]> {
  const res = await api.get<{ success: boolean; data: AccessPolicy[] }>(
    "/api/admin/access-policies",
  );
  return res.data.data ?? [];
}

export async function createAccessPolicy(
  input: AccessPolicyInput,
): Promise<AccessPolicy> {
  try {
    const res = await api.post<{ success: boolean; data: AccessPolicy }>(
      "/api/admin/access-policies",
      input,
    );
    return res.data.data;
  } catch (e) {
    throw new Error(getApiErrorMessage(e, "Creation impossible"));
  }
}

export async function updateAccessPolicy(
  id: number,
  input: AccessPolicyInput,
): Promise<AccessPolicy> {
  try {
    const res = await api.put<{ success: boolean; data: AccessPolicy }>(
      `/api/admin/access-policies/${id}`,
      input,
    );
    return res.data.data;
  } catch (e) {
    throw new Error(getApiErrorMessage(e, "Mise a jour impossible"));
  }
}

export async function deleteAccessPolicy(id: number): Promise<void> {
  await api.delete(`/api/admin/access-policies/${id}`);
}
