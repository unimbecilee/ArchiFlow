/** Kind d'apercu navigateur (hors editeur bureautique). */
export type PreviewKind =
  | "image"
  | "pdf"
  | "text"
  | "audio"
  | "video"
  | "office"
  | "unknown";

const OFFICE_EXT = /\.(docx?|xlsx?|pptx?|odt|ods|odp|rtf|csv)$/i;

export function resolvePreviewKind(mime?: string, fileName?: string): PreviewKind {
  const m = (mime || "").toLowerCase().trim();
  const name = (fileName || "").toLowerCase();

  if (m.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg|avif|ico)$/i.test(name)) {
    return "image";
  }
  if (m === "application/pdf" || name.endsWith(".pdf")) {
    return "pdf";
  }
  if (
    m.startsWith("text/") ||
    m === "application/json" ||
    m === "application/xml" ||
    /\.(txt|md|markdown|json|xml|csv|log|yml|yaml|html?|css|js|ts|tsx|jsx)$/i.test(name)
  ) {
    return "text";
  }
  if (m.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(name)) {
    return "audio";
  }
  if (m.startsWith("video/") || /\.(mp4|webm|ogg|mov|mkv)$/i.test(name)) {
    return "video";
  }
  if (
    OFFICE_EXT.test(name) ||
    m.includes("wordprocessing") ||
    m.includes("spreadsheet") ||
    m.includes("presentation") ||
    m === "application/msword" ||
    m === "application/vnd.ms-excel" ||
    m === "application/vnd.ms-powerpoint" ||
    m === "application/rtf" ||
    m === "text/csv"
  ) {
    return "office";
  }
  return "unknown";
}

export function isBrowserPreviewable(mime?: string, fileName?: string): boolean {
  const kind = resolvePreviewKind(mime, fileName);
  return kind !== "unknown" && kind !== "office";
}
