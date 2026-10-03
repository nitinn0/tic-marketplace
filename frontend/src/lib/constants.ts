export const appName = "TIC Marketplace";

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4011/api/v1";

export const routes = {
  home: "/",
  login: "/login",
  dashboard: "/dashboard",
  adminRbac: "/admin/rbac",
} as const;

export type UserRole = "buyer" | "provider" | "admin";
