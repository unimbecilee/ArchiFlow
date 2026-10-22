import api from "@/lib/api";

export async function getMfaStatus(): Promise<boolean> {
  const res = await api.get<{
    success: boolean;
    data: { mfa_enabled?: boolean };
  }>("/api/mfa/status");
  return Boolean(res.data.data?.mfa_enabled);
}

export async function enrollMfa(): Promise<{
  secret: string;
  qr_code_url: string;
}> {
  const res = await api.post<{
    success: boolean;
    data: { secret: string; qr_code_url: string };
  }>("/api/mfa/enroll");
  return res.data.data;
}

export async function confirmMfa(
  code: string,
  secret?: string,
): Promise<string[]> {
  const res = await api.post<{
    success: boolean;
    data: { recovery_codes: string[] };
  }>("/api/mfa/confirm", { code, secret });
  return res.data.data?.recovery_codes ?? [];
}

export async function disableMfa(password: string): Promise<void> {
  await api.post("/api/mfa/disable", { password });
}

export async function regenerateRecoveryCodes(
  password: string,
): Promise<string[]> {
  const res = await api.post<{
    success: boolean;
    data: { recovery_codes: string[] };
  }>("/api/mfa/recovery-codes", { password });
  return res.data.data?.recovery_codes ?? [];
}
