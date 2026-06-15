import type { User } from "@/types/auth";

export type AdminUserDetail = User & {
  pydio_user_id?: string;
};

export type AdminUpdateUserPayload = {
  first_name?: string;
  last_name?: string;
  role?: string;
  is_active?: boolean;
};

export type AdminUserActionResult = {
  user: AdminUserDetail;
  email_sent?: boolean;
};
