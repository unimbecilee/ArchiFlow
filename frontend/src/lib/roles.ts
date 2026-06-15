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
  archivist: "Lecture org + historique workflows",
};

export const ASSIGNABLE_ROLES: PlatformRole[] = [
  "user",
  "manager",
  "validator",
  "archivist",
  "admin",
];

export function canViewOrgWorkflows(role?: string, caps?: RoleCapabilities): boolean {
  return caps?.view_org_workflows ?? (role === "admin" || role === "archivist");
}

export function canWriteDocuments(role?: string, caps?: RoleCapabilities): boolean {
  return caps?.write_documents ?? role !== "archivist";
}
