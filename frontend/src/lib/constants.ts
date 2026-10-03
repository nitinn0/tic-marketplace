import { getApiBaseUrl } from "@/lib/api";

export const appName = "TIC Marketplace";

export const apiBaseUrl = getApiBaseUrl();

export const routes = {
  home: "/",
  login: "/login",
  dashboard: "/dashboard",
  adminRbac: "/admin/rbac",
} as const;

export type UserRole = "buyer" | "provider" | "admin";
