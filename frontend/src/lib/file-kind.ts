export type FileKind = "folder" | "pdf" | "doc" | "sheet" | "image" | "archive";

export const FILE_KIND_STYLE: Record<FileKind, string> = {
  folder: "bg-warning-soft text-warning-soft-foreground ring-warning/30",
  pdf: "bg-destructive-soft text-destructive-soft-foreground ring-destructive/30",
  doc: "bg-info-soft text-info-soft-foreground ring-info/30",
  sheet: "bg-accent-soft text-accent-soft-foreground ring-primary/30",
  image: "bg-violet-50 text-violet-600 ring-violet-100",
  archive: "bg-muted text-muted-foreground ring-border",
};

export function kindFromName(name?: string, mime?: string): FileKind {
  const source = `${name ?? ""} ${mime ?? ""}`.toLowerCase();
  if (source.includes("folder") || source.includes("dossier")) return "folder";
  if (source.includes("pdf") || source.endsWith(".pdf")) return "pdf";
  if (
    /\.(xls|xlsx|ods|csv)\b/.test(source) ||
    source.includes("spreadsheet") ||
    source.includes("excel")
  ) {
    return "sheet";
  }
  if (/\.(png|jpe?g|gif|webp|svg)\b/.test(source) || source.includes("image/"))
    return "image";
  if (
    /\.(zip|7z|tar|gz|rar)\b/.test(source) ||
    source.includes("zip") ||
    source.includes("archive")
  ) {
    return "archive";
  }
  return "doc";
}
