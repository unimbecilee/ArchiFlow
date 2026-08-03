import { SETTINGS_NAV, type SettingsNavItem } from "@/config/settings-nav";
import type { RoleCapabilities } from "@/lib/roles";

export type SettingsAccessContext = {
  isAdmin: boolean;
};

export function buildSettingsAccessContext(user: {
  role?: string;
  capabilities?: RoleCapabilities;
} | null): SettingsAccessContext {
  const isAdmin =
    user?.role === "admin" || user?.capabilities?.admin_panel === true;
  return { isAdmin };
}

export function canSeeSettingsItem(
  item: SettingsNavItem,
  ctx: SettingsAccessContext
): boolean {
  if (item.adminOnly && !ctx.isAdmin) return false;
  return true;
}

export function listVisibleSettingsNav(ctx: SettingsAccessContext): SettingsNavItem[] {
  return SETTINGS_NAV.filter((item) => canSeeSettingsItem(item, ctx));
}

export function canManageAccessPolicies(user: {
  role?: string;
  capabilities?: RoleCapabilities;
} | null): boolean {
  return buildSettingsAccessContext(user).isAdmin;
}
