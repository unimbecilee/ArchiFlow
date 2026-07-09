const DB_NAME = "archiflow-uploads";
const STORE = "sessions";
const DB_VERSION = 1;

export type StoredUploadSession = {
  fingerprint: string;
  sessionId: string;
  fileName: string;
  fileSize: number;
  partSize: number;
  totalParts: number;
  parts: Record<number, { etag: string; size: number }>;
  updatedAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "fingerprint" });
      }
    };
  });
}

export async function loadUploadSession(
  fingerprint: string
): Promise<StoredUploadSession | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(fingerprint);
    req.onsuccess = () => resolve((req.result as StoredUploadSession) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function saveUploadSession(session: StoredUploadSession): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ ...session, updatedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearUploadSession(fingerprint: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(fingerprint);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function fileFingerprint(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}
