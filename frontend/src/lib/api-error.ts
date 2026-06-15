import type { AxiosError } from "axios";

/** Message lisible depuis une erreur API axios (400, 403, etc.). */
export function getApiErrorMessage(err: unknown, fallback = "Requete echouee"): string {
  if (err && typeof err === "object" && "isAxiosError" in err) {
    const ax = err as AxiosError<{ error?: string; message?: string }>;
    const data = ax.response?.data;
    if (data && typeof data === "object") {
      if (typeof data.error === "string" && data.error) return data.error;
      if (typeof data.message === "string" && data.message) return data.message;
    }
    if (ax.message) return ax.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
