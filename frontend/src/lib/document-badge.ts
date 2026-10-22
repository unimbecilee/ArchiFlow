import type { Document } from "@/types/documents";

export type BadgeTone = "amber" | "sky" | "emerald";

export function documentBadge(
  doc: Document,
): { label: string; tone: BadgeTone } | undefined {
  if (doc.on_hold) return { label: "Conservation", tone: "amber" };
  const status = (doc.status ?? "").toLowerCase();
  if (!status) return undefined;
  if (status.includes("sign") || status.includes("approuv"))
    return { label: "Signé", tone: "emerald" };
  if (status.includes("valid")) return { label: "À valider", tone: "sky" };
  if (
    status.includes("attente") ||
    status.includes("approbation") ||
    status.includes("pending") ||
    status.includes("en_cours") ||
    status.includes("workflow")
  ) {
    return { label: "En approbation", tone: "amber" };
  }
  return undefined;
}
