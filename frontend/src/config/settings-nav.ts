import type { Icon } from "@phosphor-icons/react";
import { UserCircle, Key, LockKey } from "@phosphor-icons/react";

export type SettingsNavItem = {
  title: string;
  description: string;
  path: string;
  icon: Icon;
  /** Réservé aux administrateurs plateforme (API admin). */
  adminOnly?: boolean;
};

export const SETTINGS_NAV: SettingsNavItem[] = [
  {
    title: "Compte",
    description: "Profil",
    path: "/parametres/compte",
    icon: UserCircle,
  },
  {
    title: "Sécurité",
    description: "Mot de passe",
    path: "/parametres/securite",
    icon: Key,
  },
  {
    title: "Politiques ABAC",
    description: "Accès",
    path: "/parametres/politiques-abac",
    icon: LockKey,
    adminOnly: true,
  },
];
