import api from "./api";

export type PydioIntegrationConfig = {
  cells_url: string;
  webdav_url: string;
  archive_api_base_url: string;
  archives_requests_endpoint: string;
  sso_enabled: boolean;
  sso_note?: string;
};

export async function fetchPydioConfig(): Promise<PydioIntegrationConfig | null> {
  try {
    const res = await api.get<{
      success: boolean;
      data: PydioIntegrationConfig;
    }>("/api/integrations/pydio");
    return res.data.data;
  } catch {
    return null;
  }
}

export function cellsPublicUrl(): string {
  return process.env.NEXT_PUBLIC_CELLS_URL || "http://localhost:4001";
}

export async function fetchPydioSSOLaunchUrl(): Promise<string | null> {
  try {
    const res = await api.get<{ success: boolean; launch_url: string }>(
      "/api/integrations/pydio/sso-launch",
    );
    return res.data.launch_url || null;
  } catch {
    return null;
  }
}
