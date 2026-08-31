export type FileKind = "folder" | "pdf" | "doc" | "sheet" | "image" | "archive";

export const FILE_KIND_STYLE: Record<FileKind, string> = {
  folder: "bg-amber-50 text-amber-600 ring-amber-100",
  pdf: "bg-red-50 text-red-600 ring-red-100",
  doc: "bg-sky-50 text-sky-600 ring-sky-100",
  sheet: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  image: "bg-violet-50 text-violet-600 ring-violet-100",
  archive: "bg-zinc-100 text-zinc-600 ring-zinc-200",
};

export function kindFromName(name?: string, mime?: string): FileKind {
  const source = `${name ?? ""} ${mime ?? ""}`.toLowerCase();
  if (source.includes("folder") || source.includes("dossier")) return "folder";
  if (source.includes("pdf") || source.endsWith(".pdf")) return "pdf";
  if (/\.(xls|xlsx|ods|csv)\b/.test(source) || source.includes("spreadsheet") || source.includes("excel")) {
    return "sheet";
  }
  if (/\.(png|jpe?g|gif|webp|svg)\b/.test(source) || source.includes("image/")) return "image";
  if (/\.(zip|7z|tar|gz|rar)\b/.test(source) || source.includes("zip") || source.includes("archive")) {
    return "archive";
  }
  return "doc";
}
