import type { Icon } from "@phosphor-icons/react";
import {
  SquaresFour,
  FolderOpen,
  ShareNetwork,
  Clock,
  Star,
  MagnifyingGlass,
  UploadSimple,
  GitBranch,
  CheckCircle,
  ListBullets,
  Archive,
  Bell,
  Trash,
  ShieldCheck,
  TreeStructure,
} from "@phosphor-icons/react";
import { COLLABORATION_MENU_LABEL } from "@/lib/branding";

export type MenuItem = {
  title: string;
  path: string;
  icon: Icon;
  external?: boolean;
  adminOnly?: boolean;
  requiresWrite?: boolean;
};

export type MenuSection = {
  heading?: string;
  items: MenuItem[];
};

export const MENU_ARCHIFLOW: MenuSection[] = [
  {
    items: [{ title: "Dashboard", path: "/", icon: SquaresFour }],
  },
  {
    heading: "Documents",
    items: [
      { title: "Mes Documents", path: "/mes-documents", icon: FolderOpen },
      { title: "Partages", path: "/documents-partages", icon: ShareNetwork },
      { title: "Notifications", path: "/notifications", icon: Bell },
      { title: "Récents", path: "/documents-recents", icon: Clock },
      { title: "Favoris", path: "/favoris", icon: Star },
    ],
  },
  {
    heading: "Actions",
    items: [
      { title: "Recherche", path: "/recherche", icon: MagnifyingGlass },
      { title: "Corbeille", path: "/corbeille", icon: Trash },
      { title: "Importer", path: "/importer", icon: UploadSimple, requiresWrite: true },
      { title: COLLABORATION_MENU_LABEL, path: "/ged/cells", icon: ShareNetwork },
    ],
  },
  {
    heading: "Workflows",
    items: [
      { title: "Vue d'ensemble", path: "/workflows", icon: GitBranch },
      { title: "Approbations", path: "/workflows/approbations", icon: CheckCircle },
      { title: "En cours", path: "/workflows/en-cours", icon: ListBullets },
      { title: "Terminés", path: "/workflows/termines", icon: Archive },
    ],
  },
  {
    heading: "Administration",
    items: [
      {
        title: "Utilisateurs",
        path: "/admin/users",
        icon: ShieldCheck,
        adminOnly: true,
      },
      {
        title: "Workflows",
        path: "/admin/workflows",
        icon: TreeStructure,
        adminOnly: true,
      },
    ],
  },
];
