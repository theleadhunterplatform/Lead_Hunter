export const ADMIN_ROUTES = {
  root: "/admin",
  dashboard: "/admin/dashboard",
  leadIntelligence: "/admin/lead-intelligence",
  approvals: "/admin/user-approvals",
  tokens: "/admin/tokens",
  keywords: "/admin/keywords",
  targets: "/admin/targets",
  team: "/admin/team",
  rbac: "/admin/rbac",
} as const;

export function hasAdminAreaAccess(
  permissions: Set<string>,
  hasPermission: (permission: string) => boolean
): boolean {
  if (permissions.has("*")) return true;
  return (
    hasPermission("user:read") ||
    hasPermission("system:admin") ||
    hasPermission("keyword:create") ||
    hasPermission("target:read") ||
    hasPermission("scraping:manage") ||
    hasPermission("role:read")
  );
}
