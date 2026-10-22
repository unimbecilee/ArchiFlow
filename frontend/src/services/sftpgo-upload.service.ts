/** Browser → SFTPGo → MinIO hot-path uploader (bytes never hit ArchiFlow API). */

import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import { MAX_RESUMABLE_FILE_BYTES } from "@/lib/upload-limits";
import type { Document } from "@/types/documents";

/** Classic multipart ceiling (Flask-style MAX_CONTENT_LENGTH). */
const MAX_CONTENT_LENGTH = 20 * 1024 * 1024;

export type SftpGoUploadMeta = {
  folder_id?: number | null;
  description?: string;
  category?: string;
};

export type SftpGoFileSpec = {
  file: File;
  relative_path?: string;
  titre?: string;
};

export type SftpGoProgress = {
  fileName: string;
  bytesUploaded: number;
  bytesTotal: number;
  filesDone: number;
  filesTotal: number;
};

type TokenFileOut = {
  name: string;
  mode: string;
  path: string;
  size: number;
};

type TokenData = {
  token: string;
  expires_in: number;
  uploadUrlBase: string;
  folder_id?: number | null;
  files: TokenFileOut[];
};

const MAX_CONCURRENT = 4;

async function mintToken(
  folderId: number | null | undefined,
  specs: SftpGoFileSpec[],
): Promise<TokenData> {
  const res = await api.post<{ success: boolean; data: TokenData }>(
    "/api/upload/token",
    {
      folder_id: folderId ?? undefined,
      files: specs.map((s) => ({
        name: s.file.name,
        size: s.file.size,
        relative_path: s.relative_path || undefined,
      })),
    },
  );
  return res.data.data;
}

async function refreshToken(): Promise<{
  token: string;
  uploadUrlBase: string;
}> {
  const res = await api.post<{
    success: boolean;
    data: { token: string; expires_in: number; uploadUrlBase: string };
  }>("/api/upload/token/refresh");
  return res.data.data;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function putFileSftpGo(
  uploadUrlBase: string,
  token: string,
  virtualPath: string,
  file: File,
  onBytes?: (n: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  let attempt = 0;
  let auth = token;
  let base = uploadUrlBase.replace(/\/$/, "");
  let delay = 1000;

  while (attempt < 6) {
    attempt++;
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const url =
      `${base}/api/v2/user/files/upload` +
      `?path=${encodeURIComponent(virtualPath)}&mkdir_parents=true`;

    const status = await new Promise<number>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.setRequestHeader("Authorization", `Bearer ${auth}`);
      xhr.setRequestHeader(
        "Content-Type",
        file.type || "application/octet-stream",
      );
      xhr.withCredentials = false;
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) onBytes?.(ev.loaded);
      };
      xhr.onload = () => resolve(xhr.status);
      xhr.onerror = () =>
        reject(new Error("NetworkError when uploading to SFTPGo"));
      xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));
      if (signal) {
        signal.addEventListener("abort", () => xhr.abort(), { once: true });
      }
      xhr.send(file);
    });

    if (status >= 200 && status < 300) {
      onBytes?.(file.size);
      return;
    }
    if (status === 401) {
      const refreshed = await refreshToken();
      auth = refreshed.token;
      base = refreshed.uploadUrlBase.replace(/\/$/, "");
      await sleep(delay);
      delay = Math.min(delay * 2, 15000);
      continue;
    }
    if (status === 429 || status >= 500) {
      await sleep(delay);
      delay = Math.min(delay * 2, 15000);
      continue;
    }
    throw new Error(`SFTPGo upload ${status}`);
  }
  throw new Error("SFTPGo upload failed after retries");
}

export async function putFilesViaSftpGo(
  specs: SftpGoFileSpec[],
  meta: SftpGoUploadMeta,
  onProgress?: (p: SftpGoProgress) => void,
  signal?: AbortSignal,
): Promise<Array<{ file: File; document?: Document; error?: string }>> {
  if (specs.length === 0) return [];
  for (const s of specs) {
    if (s.file.size > MAX_RESUMABLE_FILE_BYTES) {
      throw new Error(
        `Fichier trop volumineux (MAX_CONTENT_LENGTH resumable=${MAX_RESUMABLE_FILE_BYTES}, classic=${MAX_CONTENT_LENGTH}): ${s.file.name}`,
      );
    }
  }

  const tokenData = await mintToken(meta.folder_id, specs);
  const pathByName = new Map(tokenData.files.map((f) => [f.name, f]));

  const results: Array<{ file: File; document?: Document; error?: string }> =
    new Array(specs.length);
  let filesDone = 0;
  const bytesTotal = specs.reduce((s, x) => s + x.file.size, 0);
  const bytesPerFile = new Map<number, number>();

  const report = (fileName: string) => {
    let bytesUploaded = 0;
    Array.from(bytesPerFile.values()).forEach((v) => {
      bytesUploaded += v;
    });
    onProgress?.({
      fileName,
      bytesUploaded,
      bytesTotal,
      filesDone,
      filesTotal: specs.length,
    });
  };

  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(MAX_CONCURRENT, specs.length) },
    async () => {
      while (cursor < specs.length) {
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
        const idx = cursor++;
        const spec = specs[idx];
        const mapped = pathByName.get(spec.file.name);
        const vpath = mapped?.path;
        if (!vpath || mapped.mode !== "sftpgo") {
          results[idx] = {
            file: spec.file,
            error:
              mapped?.mode === "s3"
                ? "Fichier trop gros pour SFTPGo (utilise MPU)"
                : "Path manquant",
          };
          filesDone++;
          report(spec.file.name);
          continue;
        }
        try {
          await putFileSftpGo(
            tokenData.uploadUrlBase,
            tokenData.token,
            vpath,
            spec.file,
            (n) => {
              bytesPerFile.set(idx, n);
              report(spec.file.name);
            },
            signal,
          );
          results[idx] = {
            file: spec.file,
            document: {
              id: 0,
              titre:
                spec.titre ||
                spec.file.name.replace(/\.[^.]+$/, "") ||
                spec.file.name,
              file_name: spec.file.name,
              taille: spec.file.size,
              mime_type: spec.file.type || "application/octet-stream",
              date_creation: new Date().toISOString(),
              folder_id: meta.folder_id ?? undefined,
            },
          };
        } catch (err) {
          results[idx] = {
            file: spec.file,
            error: getApiErrorMessage(err, "Echec SFTPGo"),
          };
        }
        filesDone++;
        bytesPerFile.set(idx, spec.file.size);
        report(spec.file.name);
      }
    },
  );

  await Promise.all(workers);
  return results;
}

export function isSftpGoHotPathEnabled(): boolean {
  // Backend decides; frontend always tries token mint when this flag is true via env proxy.
  // Build-time: NEXT_PUBLIC optional; runtime we detect by attempting token when selected.
  return (
    process.env.NEXT_PUBLIC_SFTPGO_UPLOAD === "1" ||
    process.env.NEXT_PUBLIC_SFTPGO_UPLOAD === "true"
  );
}
