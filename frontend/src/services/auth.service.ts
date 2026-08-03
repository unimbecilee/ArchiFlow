import axios from "@/lib/api";
import type { User } from "@/types/auth";

export type UpdateProfilePayload = {
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
};

export async function updateMyProfile(payload: UpdateProfilePayload): Promise<User> {
  const { data } = await axios.put<{ success?: boolean; data: User }>("/api/auth/me", payload);
  if (!data?.data) {
    throw new Error("Profil invalide");
  }
  return data.data;
}
