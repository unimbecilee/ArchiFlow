import { MENU_ARCHIFLOW } from "@/config/menu-archiflow";
import { SETTINGS_NAV } from "@/config/settings-nav";

export type PageCrumb = { label: string; href?: string };

export type PageMeta = {
  title: string;
  section: string;
  crumbs: PageCrumb[];
};

const menuByPath = new Map<string, { title: string; section: string }>();
for (const block of MENU_ARCHIFLOW) {
  const section = block.heading ?? "Accueil";
  for (const item of block.items) {
    menuByPath.set(item.path, { title: item.title, section });
  }
}

for (const item of SETTINGS_NAV) {
  menuByPath.set(item.path, { title: item.title, section: "Paramètres" });
}
menuByPath.set("/parametres", { title: "Paramètres", section: "Paramètres" });

function metaFromMenu(path: string): PageMeta | null {
  const hit = menuByPath.get(path);
  if (!hit) return null;
  return {
    title: hit.title,
    section: hit.section,
    crumbs:
      path === "/" || path === "/mes-documents"
        ? [{ label: hit.title, href: path }]
        : [{ label: hit.section }, { label: hit.title, href: path }],
  };
}

function dynamicMeta(pathname: string): PageMeta | null {
  if (/^\/documents\/[^/]+$/.test(pathname)) {
    return {
      title: "Fiche document",
      section: "Documents",
      crumbs: [
        { label: "Documents" },
        { label: "Mes documents", href: "/mes-documents" },
        { label: "Fiche document" },
      ],
    };
  }
  if (/^\/admin\/users\/[^/]+$/.test(pathname)) {
    return {
      title: "Fiche utilisateur",
      section: "Administration",
      crumbs: [
        { label: "Administration" },
        { label: "Utilisateurs", href: "/admin/users" },
        { label: "Fiche" },
      ],
    };
  }
  if (pathname === "/admin/workflows/new") {
    return {
      title: "Nouveau workflow",
      section: "Administration",
      crumbs: [
        { label: "Administration" },
        { label: "Workflows", href: "/admin/workflows" },
        { label: "Nouveau" },
      ],
    };
  }
  if (/^\/admin\/workflows\/[^/]+$/.test(pathname)) {
    return {
      title: "Éditer le workflow",
      section: "Administration",
      crumbs: [
        { label: "Administration" },
        { label: "Workflows", href: "/admin/workflows" },
        { label: "Édition" },
      ],
    };
  }
  if (/^\/workflows\/instances\/[^/]+$/.test(pathname)) {
    return {
      title: "Instance workflow",
      section: "Workflows",
      crumbs: [
        { label: "Workflows" },
        { label: "Vue d'ensemble", href: "/workflows" },
        { label: "Instance" },
      ],
    };
  }
  return null;
}

export function resolvePageMeta(pathname: string): PageMeta {
  const fromMenu = metaFromMenu(pathname);
  if (fromMenu) return fromMenu;

  const dynamic = dynamicMeta(pathname);
  if (dynamic) return dynamic;

  const segment = pathname.split("/").filter(Boolean).pop();
  const fallbackTitle = segment
    ? segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ")
    : "ArchiFlow";

  return {
    title: fallbackTitle,
    section: "ArchiFlow",
    crumbs: [{ label: fallbackTitle }],
  };
}
