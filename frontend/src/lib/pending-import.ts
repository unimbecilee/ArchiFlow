let pending: File[] = [];

export function pushPendingImportFiles(files: File[]) {
  pending = [...pending, ...files];
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("archiflow:pending-import"));
  }
}

export function takePendingImportFiles(): File[] {
  const next = pending;
  pending = [];
  return next;
}
