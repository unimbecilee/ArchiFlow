import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  MAX_RESUMABLE_PARALLEL_PARTS,
  RESUMABLE_UPLOAD_THRESHOLD_BYTES,
} from "@/lib/upload-limits";
import {
  clearUploadSession,
  fileFingerprint,
  loadUploadSession,
  saveUploadSession,
} from "@/lib/upload-indexeddb";
import type { Document } from "@/types/documents";

export type ResumableUploadMeta = {
  title?: string;
  description?: string;
  category?: string;
  folder_id?: number | null;
};

export type ResumableProgress = {
  fileName: string;
  bytesUploaded: number;
  bytesTotal: number;
  partsDone: number;
  partsTotal: number;
  speedBps: number;
  etaSeconds: number | null;
};

type InitResponse = {
  session_id: string;
  minio_upload_id: string;
  object_key: string;
  part_size: number;
  total_parts: number;
  expires_at: string;
  resumed: boolean;
  completed_parts?: number[];
};

type PartURLResponse = {
  part_number: number;
  url: string;
  expires_in_seconds: number;
};

type CompleteResponse = {
  document_id: number;
  title: string;
  status: string;
};

async function sha256Hex(file: File): Promise<string> {
  if (file.size > 100 * 1024 * 1024) {
    return "";
  }
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeEtag(raw: string): string {
  return raw.replace(/^"+|"+$/g, "");
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function putPartWithRetry(
  url: string,
  blob: Blob,
  contentType: string,
  maxAttempts = 5
): Promise<string> {
  let delay = 1000;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url, {
      method: "PUT",
      body: blob,
      headers: { "Content-Type": contentType || "application/octet-stream" },
    });
    if (res.ok) {
      const etag = res.headers.get("ETag") ?? res.headers.get("etag");
      if (!etag) throw new Error("ETag manquant apres upload part");
      return normalizeEtag(etag);
    }
    if (attempt === maxAttempts) {
      throw new Error(`Echec upload part (${res.status})`);
    }
    await sleep(delay);
    delay = Math.min(delay * 2, 30000);
  }
  throw new Error("Echec upload part");
}

export async function uploadFileResumable(
  file: File,
  meta: ResumableUploadMeta,
  onProgress?: (p: ResumableProgress) => void,
  signal?: AbortSignal
): Promise<Document> {
  const fingerprint = fileFingerprint(file);
  const fileSha = await sha256Hex(file);
  let sessionId: string | null = null;

  try {
  const initRes = await api.post<{ success: boolean; data: InitResponse }>(
    "/api/upload/sessions",
    {
      file_name: file.name,
      file_size: file.size,
      content_type: file.type || "application/octet-stream",
      file_sha256: fileSha || undefined,
      folder_id: meta.folder_id ?? undefined,
      title: meta.title,
      description: meta.description,
      category: meta.category,
    }
  );
  const init = initRes.data.data;
  sessionId = init.session_id;
  const partSize = init.part_size;
  const totalParts = init.total_parts;

  let stored = await loadUploadSession(fingerprint);
  if (!stored || stored.sessionId !== sessionId) {
    stored = {
      fingerprint,
      sessionId,
      fileName: file.name,
      fileSize: file.size,
      partSize,
      totalParts,
      parts: {},
      updatedAt: Date.now(),
    };
  }

  const completed = new Set<number>([
    ...Object.keys(stored.parts).map(Number),
    ...(init.completed_parts ?? []),
  ]);

  let bytesUploaded = 0;
  for (const n of Array.from(completed)) {
    bytesUploaded += stored.parts[n]?.size ?? partSize;
  }
  if (bytesUploaded > file.size) bytesUploaded = file.size;

  const pending: number[] = [];
  for (let n = 1; n <= totalParts; n++) {
    if (!completed.has(n)) pending.push(n);
  }

  const startTime = Date.now();
  let lastProgressAt = startTime;
  let lastBytes = bytesUploaded;

  const report = () => {
    const now = Date.now();
    const elapsed = (now - lastProgressAt) / 1000;
    const delta = bytesUploaded - lastBytes;
    const speedBps = elapsed > 0 ? delta / elapsed : 0;
    if (elapsed >= 0.5) {
      lastProgressAt = now;
      lastBytes = bytesUploaded;
    }
    const remaining = file.size - bytesUploaded;
    const etaSeconds = speedBps > 0 ? remaining / speedBps : null;
    onProgress?.({
      fileName: file.name,
      bytesUploaded,
      bytesTotal: file.size,
      partsDone: completed.size,
      partsTotal: totalParts,
      speedBps,
      etaSeconds,
    });
  };

  report();

  const uploadOne = async (partNumber: number) => {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const urlRes = await api.get<{ success: boolean; data: PartURLResponse }>(
      `/api/upload/sessions/${sessionId}/parts/${partNumber}/url`
    );
    const start = (partNumber - 1) * partSize;
    const end = Math.min(start + partSize, file.size);
    const blob = file.slice(start, end);
    const etag = await putPartWithRetry(
      urlRes.data.data.url,
      blob,
      file.type || "application/octet-stream"
    );
    const size = end - start;
    stored!.parts[partNumber] = { etag, size };
    completed.add(partNumber);
    bytesUploaded += size;
    await saveUploadSession(stored!);
    report();
    return { part_number: partNumber, etag };
  };

  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(MAX_RESUMABLE_PARALLEL_PARTS, pending.length || 1) },
    async () => {
      while (cursor < pending.length) {
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
        const idx = cursor++;
        const partNumber = pending[idx];
        await uploadOne(partNumber);
      }
    }
  );
  await Promise.all(workers);

  const parts = Object.entries(stored.parts)
    .map(([n, p]) => ({ part_number: Number(n), etag: p.etag }))
    .sort((a, b) => a.part_number - b.part_number);

  const completeRes = await api.post<{ success: boolean; data: CompleteResponse }>(
    `/api/upload/sessions/${sessionId}/complete`,
    { parts }
  );

  await clearUploadSession(fingerprint);

  const doc: Document = {
    id: completeRes.data.data.document_id,
    titre: completeRes.data.data.title,
    title: completeRes.data.data.title,
    file_name: file.name,
    taille: file.size,
    mime_type: file.type || "application/octet-stream",
    date_creation: new Date().toISOString(),
  };

  return doc;
  } catch (err) {
    if (sessionId) {
      await abortResumableSession(sessionId).catch(() => {});
      await clearUploadSession(fingerprint).catch(() => {});
    }
    throw err;
  }
}

export async function abortResumableSession(sessionId: string): Promise<void> {
  await api.delete(`/api/upload/sessions/${sessionId}`);
}

export function isResumableFile(file: File): boolean {
  return file.size > RESUMABLE_UPLOAD_THRESHOLD_BYTES;
}

export function formatUploadError(err: unknown): string {
  return getApiErrorMessage(err);
}
