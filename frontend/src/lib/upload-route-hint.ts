import { MAX_IMPORT_FILE_BYTES } from "@/lib/upload-accept";
import { isResumableFile } from "@/services/resumable-upload.service";
import { isSftpGoHotPathEnabled } from "@/services/sftpgo-upload.service";

export type UploadQueueStats = {
  sftpGoEnabled: boolean;
  httpCount: number;
  mpuCount: number;
  totalBytes: number;
};

export function summarizeUploadQueue(files: File[]): UploadQueueStats {
  const sftpGoEnabled = isSftpGoHotPathEnabled();
  let httpCount = 0;
  let mpuCount = 0;
  let totalBytes = 0;
  for (const file of files) {
    totalBytes += file.size;
    if (sftpGoEnabled) {
      if (isResumableFile(file)) mpuCount += 1;
      else httpCount += 1;
      continue;
    }
    if (isResumableFile(file)) mpuCount += 1;
    else httpCount += 1;
  }
  return { sftpGoEnabled, httpCount, mpuCount, totalBytes };
}

export function uploadRouteHeadline(stats: UploadQueueStats): string {
  if (stats.sftpGoEnabled) {
    return "Chemin prioritaire : navigateur → SFTPGo → MinIO";
  }
  if (stats.mpuCount > 0 && stats.httpCount > 0) {
    return "Fichiers ≤ 20 Mo en HTTP · au-delà en reprise (MPU)";
  }
  if (stats.mpuCount > 0) return "Upload reprise multipart (MPU)";
  return "Upload HTTP direct (API ArchiFlow)";
}

export function uploadRouteDetail(stats: UploadQueueStats): string {
  const parts: string[] = [];
  if (stats.sftpGoEnabled) {
    parts.push(
      "Les octets ne transitent pas par l'API ArchiFlow tant que SFTPGo repond. Les tres gros fichiers peuvent basculer en MPU.",
    );
  } else {
    parts.push(
      "SFTPGo inactif (NEXT_PUBLIC_SFTPGO_UPLOAD) : envoi via API ArchiFlow (HTTP ou MPU).",
    );
  }
  if (stats.httpCount > 0) {
    parts.push(
      `${stats.httpCount} fichier(s) ≤ ${MAX_IMPORT_FILE_BYTES / (1024 * 1024)} Mo${stats.sftpGoEnabled ? " (SFTPGo ou HTTP selon repli)" : ""}.`,
    );
  }
  if (stats.mpuCount > 0) {
    parts.push(
      `${stats.mpuCount} fichier(s) > 20 Mo : reprise avec parts paralleles.`,
    );
  }
  return parts.join(" ");
}
