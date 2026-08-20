export type PlatformRole =
  | "admin"
  | "manager"
  | "user"
  | "validator"
  | "archivist";

export type RoleCapabilities = {
  admin_panel: boolean;
  approve_workflows: boolean;
  view_org_documents: boolean;
  view_org_workflows: boolean;
  write_documents: boolean;
};

export const ROLE_LABELS: Record<PlatformRole, string> = {
  admin: "Administrateur",
  manager: "Manager",
  user: "Utilisateur",
  validator: "Validateur",
  archivist: "Archiviste",
};

export const ROLE_HINTS: Record<PlatformRole, string> = {
  admin: "Gestion complete plateforme",
  manager: "Approbations et pilotage equipe",
  user: "Coffre personnel et partages",
  validator: "Approbations workflow assignees",
  archivist: "Coffre personnel + vue org + classement MAC",
};

export const ASSIGNABLE_ROLES: PlatformRole[] = [
  "user",
  "manager",
  "validator",
  "archivist",
  "admin",
];

export type SftpMode = "none" | "drop" | "inbox" | "full";

export const SFTP_MODE_LABELS: Record<SftpMode, string> = {
  none: "Aucun",
  drop: "Depot seul (upload)",
  inbox: "Inbox (list + upload + download)",
  full: "Complet",
};

/** Defauts canal SFTP alignes backend DefaultSftpForRole. */
export function defaultSftpForRole(role: string): { enabled: boolean; mode: SftpMode } {
  if (role === "user" || role === "manager" || role === "archivist") {
    return { enabled: true, mode: "drop" };
  }
  return { enabled: false, mode: "none" };
}

export function canViewOrgWorkflows(role?: string, caps?: RoleCapabilities): boolean {
  return caps?.view_org_workflows ?? (role === "admin" || role === "archivist");
}

export function canWriteDocuments(role?: string, caps?: RoleCapabilities): boolean {
  return caps?.write_documents ?? true;
}
