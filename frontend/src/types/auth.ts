export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'user' | 'manager' | 'validator' | 'archivist';
  avatar_url?: string;
  sftp_enabled?: boolean;
  sftp_mode?: 'none' | 'drop' | 'inbox' | 'full';
  is_active: boolean;
  must_change_password?: boolean;
  pydio_linked?: boolean;
  last_login_at?: string;
  created_at: string;
  capabilities?: {
    admin_panel: boolean;
    approve_workflows: boolean;
    view_org_documents: boolean;
    view_org_workflows: boolean;
    write_documents: boolean;
  };
}

export interface AccessTokenResponse {
  access_token: string;
  expires_in: number;
}

/** @deprecated use AccessTokenResponse — refresh is HttpOnly cookie */
export type TokenPair = AccessTokenResponse & { refresh_token?: string };

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: TokenPair;
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: TokenPair;
  };
}

export interface ApiError {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
}
