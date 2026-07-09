/** Tous types de fichiers sauf executables/scripts (aligne backend blocklist). */
export const IMPORT_ACCEPT = "*/*";

export const MAX_IMPORT_FILES = 500;
/** Limite upload HTTP classique (FormData). */
export const MAX_IMPORT_FILE_MB = 20;
export const MAX_IMPORT_FILE_BYTES = MAX_IMPORT_FILE_MB * 1024 * 1024;

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
