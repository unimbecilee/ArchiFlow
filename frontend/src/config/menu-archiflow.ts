import type { Icon } from "@phosphor-icons/react";
import {
  Archive,
  Bell,
  CheckCircle,
  Clock,
  FolderOpen,
  GearSix,
  GitBranch,
  ListBullets,
  LockKey,
  MagnifyingGlass,
  ShareNetwork,
  ShieldCheck,
  SquaresFour,
  Star,
  Trash,
  TreeStructure,
  UploadSimple,
  UsersThree,
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
    heading: "GED",
    items: [
      { title: "Tableau de bord", path: "/", icon: SquaresFour },
      { title: "Mes documents", path: "/mes-documents", icon: FolderOpen },
      { title: "Partages", path: "/documents-partages", icon: ShareNetwork },
      { title: "Récents", path: "/documents-recents", icon: Clock },
      { title: "Favoris", path: "/favoris", icon: Star },
      { title: "Recherche", path: "/recherche", icon: MagnifyingGlass },
      { title: "Corbeille", path: "/corbeille", icon: Trash },
      {
        title: "Importer",
        path: "/importer",
        icon: UploadSimple,
        requiresWrite: true,
      },
      { title: "Notifications", path: "/notifications", icon: Bell },
      { title: COLLABORATION_MENU_LABEL, path: "/ged/cells", icon: UsersThree },
    ],
  },
  {
    heading: "Workflows",
    items: [
      { title: "Circuits", path: "/workflows", icon: GitBranch },
      {
        title: "Approbations",
        path: "/workflows/approbations",
        icon: CheckCircle,
      },
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
        title: "Flux de validation",
        path: "/admin/workflows",
        icon: TreeStructure,
        adminOnly: true,
      },
      {
        title: "Conservation",
        path: "/admin/conservation",
        icon: LockKey,
        adminOnly: true,
      },
    ],
  },
  {
    heading: "Paramètres",
    items: [
      { title: "Compte", path: "/parametres/compte", icon: GearSix },
      { title: "Sécurité", path: "/parametres/securite", icon: LockKey },
    ],
  },
];
