/** Tous types de fichiers sauf executables/scripts (aligne backend blocklist). */
import { MAX_CONTENT_LENGTH } from "@/lib/upload-limits";

export const IMPORT_ACCEPT = "*/*";

export const MAX_IMPORT_FILES = 500;
/** Limite upload HTTP classique (FormData) — MAX_CONTENT_LENGTH. */
export const MAX_IMPORT_FILE_MB = MAX_CONTENT_LENGTH / (1024 * 1024);
export const MAX_IMPORT_FILE_BYTES = MAX_CONTENT_LENGTH;

/** Extension File avec chemin relatif (import dossier). */
export type FileWithPath = File & { webkitRelativePath?: string };

export function fileRelativePath(file: File): string | null {
  const f = file as FileWithPath;
  const p = f.webkitRelativePath?.trim();
  return p || null;
}

export function fileParentDir(relativePath: string): string {
  const norm = relativePath.replace(/\\/g, "/");
  const idx = norm.lastIndexOf("/");
  if (idx <= 0) return "";
  return norm.slice(0, idx);
}

export function displayPath(file: File): string {
  return fileRelativePath(file) ?? file.name;
}
