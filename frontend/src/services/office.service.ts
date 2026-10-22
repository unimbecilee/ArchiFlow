import api from "@/lib/api";

export type OfficeEditorConfigResponse = {
  enabled: boolean;
  document_server?: string;
  mode?: "edit" | "view" | string;
  reason?: string;
  config?: Record<string, unknown>;
};

export async function getOfficeEditorConfig(
  documentId: number,
): Promise<OfficeEditorConfigResponse> {
  const res = await api.get<{
    success: boolean;
    data: OfficeEditorConfigResponse;
  }>(`/api/documents/${documentId}/office/config`);
  return res.data.data;
}
