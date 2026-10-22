import { createFolder, getFolders } from "@/services/documents.service";
import { fileParentDir } from "@/lib/upload-accept";

function sanitizeFolderSegment(name: string): string | null {
  const cleaned = name.trim().replace(/[/\\]/g, "").replace(/\0/g, "");
  if (!cleaned) return null;
  return cleaned.length > 255 ? cleaned.slice(0, 255) : cleaned;
}

/** Cree l'arborescence de dossiers sous une destination et retourne l'ID feuille. */
export async function resolveUploadFolder(
  baseFolderId: number | null,
  relativeDir: string,
  cache: Map<string, number | null>,
): Promise<number | null> {
  const dir = relativeDir.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!dir) return baseFolderId;
  if (cache.has(dir)) return cache.get(dir) ?? baseFolderId;

  const parts = dir.split("/").filter(Boolean);
  let parentId: number | null = baseFolderId;
  let built = "";

  for (const part of parts) {
    const segment = sanitizeFolderSegment(part);
    if (!segment) continue;
    built = built ? `${built}/${segment}` : segment;
    if (cache.has(built)) {
      parentId = cache.get(built) ?? parentId;
      continue;
    }
    const siblings = await getFolders(parentId ?? undefined);
    let folder = siblings.find((f) => f.name === segment);
    if (!folder) {
      folder = await createFolder({ name: segment, parent_id: parentId });
    }
    parentId = folder.id;
    cache.set(built, parentId);
  }
  cache.set(dir, parentId);
  return parentId;
}

/** Resout les dossiers cibles pour une liste de fichiers avec webkitRelativePath. */
export async function resolveFolderTargets(
  files: File[],
  baseFolderId: number | null,
): Promise<Map<File, number | null>> {
  const cache = new Map<string, number | null>();
  const out = new Map<File, number | null>();
  const dirs = new Set<string>();

  for (const file of files) {
    const rel = (file as File & { webkitRelativePath?: string })
      .webkitRelativePath;
    if (rel) dirs.add(fileParentDir(rel));
  }

  for (const dir of Array.from(dirs)) {
    await resolveUploadFolder(baseFolderId, dir, cache);
  }

  for (const file of files) {
    const rel = (file as File & { webkitRelativePath?: string })
      .webkitRelativePath;
    if (!rel) {
      out.set(file, baseFolderId);
      continue;
    }
    const parent = fileParentDir(rel);
    out.set(file, cache.get(parent) ?? baseFolderId);
  }
  return out;
}

type DroppedEntry = {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  file: (cb: (f: File) => void) => void;
  createReader: () => {
    readEntries: (cb: (e: DroppedEntry[]) => void) => void;
  };
};

function entryToFiles(entry: DroppedEntry, basePath = ""): Promise<File[]> {
  return new Promise((resolve, reject) => {
    if (entry.isFile) {
      entry.file((file) => {
        const rel = basePath ? `${basePath}/${file.name}` : file.name;
        try {
          Object.defineProperty(file, "webkitRelativePath", {
            value: rel,
            configurable: true,
          });
        } catch {
          /* ignore */
        }
        resolve([file]);
      });
      return;
    }
    if (!entry.isDirectory) {
      resolve([]);
      return;
    }
    const reader = entry.createReader();
    const all: DroppedEntry[] = [];
    const readBatch = () => {
      reader.readEntries(async (entries) => {
        if (!entries.length) {
          try {
            const nested = await Promise.all(
              all.map((e) =>
                entryToFiles(
                  e,
                  basePath ? `${basePath}/${entry.name}` : entry.name,
                ),
              ),
            );
            resolve(nested.flat());
          } catch (err) {
            reject(err);
          }
          return;
        }
        all.push(...entries);
        readBatch();
      });
    };
    readBatch();
  });
}

/** Extrait les fichiers d'un drop (fichiers ou dossiers). */
export async function filesFromDataTransfer(dt: DataTransfer): Promise<File[]> {
  const items = dt.items;
  if (
    items &&
    items.length > 0 &&
    typeof items[0].webkitGetAsEntry === "function"
  ) {
    const entries = Array.from(items)
      .map((item) => item.webkitGetAsEntry?.() as DroppedEntry | null)
      .filter((e): e is DroppedEntry => !!e);
    if (entries.length > 0) {
      const nested = await Promise.all(entries.map((e) => entryToFiles(e)));
      return nested.flat();
    }
  }
  return Array.from(dt.files);
}
