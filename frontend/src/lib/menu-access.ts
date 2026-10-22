import { MENU_ARCHIFLOW, type MenuItem } from "@/config/menu-archiflow";
import type { RoleCapabilities } from "@/lib/roles";

export type NavMenuEntry = {
  title: string;
  path: string;
  section: string;
};

export type MenuAccessContext = {
  isAdmin: boolean;
  canWrite: boolean;
};

export function canSeeMenuItem(
  item: MenuItem,
  ctx: MenuAccessContext,
): boolean {
  if (item.adminOnly && !ctx.isAdmin) return false;
  if (item.requiresWrite && !ctx.canWrite) return false;
  return true;
}

export function buildMenuAccessContext(
  user: {
    role?: string;
    capabilities?: RoleCapabilities;
  } | null,
): MenuAccessContext {
  return {
    isAdmin: user?.role === "admin",
    canWrite: user?.capabilities?.write_documents !== false,
  };
}

export function listNavMenuEntries(ctx: MenuAccessContext): NavMenuEntry[] {
  const out: NavMenuEntry[] = [];
  for (const block of MENU_ARCHIFLOW) {
    const section = block.heading ?? "Accueil";
    for (const item of block.items) {
      if (!canSeeMenuItem(item, ctx)) continue;
      out.push({ title: item.title, path: item.path, section });
    }
  }
  return out;
}

export function filterNavMenuEntries(
  entries: NavMenuEntry[],
  query: string,
): NavMenuEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter((e) => {
    const hay = `${e.title} ${e.section} ${e.path}`.toLowerCase();
    return hay.includes(q);
  });
}
