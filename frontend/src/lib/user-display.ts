export function userInitials(email?: string, firstName?: string, lastName?: string) {
  if (firstName?.trim() && lastName?.trim()) {
    return `${firstName.trim()[0] ?? ""}${lastName.trim()[0] ?? ""}`.toUpperCase();
  }
  if (!email) return "AF";
  const local = email.split("@")[0] ?? "AF";
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}
