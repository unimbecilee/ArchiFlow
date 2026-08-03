import type { AxiosError } from "axios";

function humanizeForbidden(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes("policy") || s.includes("abac") || s.includes("access policy")) {
    return `Acces refuse par une politique organisation : ${raw}`;
  }
  if (s.includes("classification") || s.includes("mac")) {
    return `Acces refuse (classification / MAC) : ${raw}`;
  }
  if (s.includes("share") || s.includes("partag")) {
    return `Acces refuse : partage ou permissions insuffisants. ${raw}`;
  }
  if (s.includes("role") || s.includes("rbac") || s.includes("permission")) {
    return `Acces refuse pour votre role : ${raw}`;
  }
  if (s.includes("owner") || s.includes("proprietaire")) {
    return `Acces reserve au proprietaire du document ou dossier. ${raw}`;
  }
  return raw;
}

/** Message lisible depuis une erreur API axios (400, 403, etc.). */
export function getApiErrorMessage(err: unknown, fallback = "Requete echouee"): string {
  if (err && typeof err === "object" && "isAxiosError" in err) {
    const ax = err as AxiosError<{ error?: string; message?: string }>;
    const status = ax.response?.status;
    const data = ax.response?.data;
    let body: string | undefined;
    if (data && typeof data === "object") {
      if (typeof data.error === "string" && data.error) body = data.error;
      else if (typeof data.message === "string" && data.message) body = data.message;
    }
    if (status === 403) {
      if (body) return humanizeForbidden(body);
      return "Acces refuse — droits, partage, classification ou politique ABAC.";
    }
    if (status === 401) {
      return body || "Session expiree — reconnectez-vous.";
    }
    if (status === 404) {
      return body || "Ressource introuvable.";
    }
    if (status === 429) {
      return body || "Trop de requetes — reessayez dans quelques instants.";
    }
    if (body) return body;
    if (ax.message) return ax.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
