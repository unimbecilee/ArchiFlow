import api from "@/lib/api";
import type { User } from "@/types/auth";
import type {
  AdminUserActionResult,
  AdminUserDetail,
  AdminUpdateUserPayload,
} from "@/types/admin";

export type CreateUserPayload = {
  email: string;
  first_name: string;
  last_name: string;
  role: string;
};

export type CreateUserResult = {
  user: User;
  email_sent: boolean;
};

export async function listUsers(): Promise<User[]> {
  const res = await api.get<{ success: boolean; data: User[] }>("/api/admin/users");
  return res.data.data ?? [];
}

export async function getUser(id: number): Promise<AdminUserDetail> {
  const res = await api.get<{ success: boolean; data: AdminUserDetail }>(
    `/api/admin/users/${id}`
  );
  return res.data.data;
}

export async function createUser(payload: CreateUserPayload): Promise<CreateUserResult> {
  const res = await api.post<{ success: boolean; data: CreateUserResult }>(
    "/api/admin/users",
    payload
  );
  return res.data.data;
}

export async function updateUser(
  id: number,
  payload: AdminUpdateUserPayload
): Promise<AdminUserDetail> {
  const res = await api.put<{ success: boolean; data: AdminUserDetail }>(
    `/api/admin/users/${id}`,
    payload
  );
  return res.data.data;
}

export async function patchUser(
  id: number,
  patch: { role?: string; is_active?: boolean }
): Promise<User> {
  const res = await api.patch<{ success: boolean; data: User }>(
    `/api/admin/users/${id}`,
    patch
  );
  return res.data.data;
}

export async function resendCredentials(id: number): Promise<AdminUserActionResult> {
  const res = await api.post<{ success: boolean; data: AdminUserActionResult }>(
    `/api/admin/users/${id}/resend-credentials`
  );
  return res.data.data;
}

export async function syncPydio(id: number): Promise<AdminUserActionResult> {
  const res = await api.post<{ success: boolean; data: AdminUserActionResult }>(
    `/api/admin/users/${id}/sync-pydio`
  );
  return res.data.data;
}

export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/api/admin/users/${id}`);
}
