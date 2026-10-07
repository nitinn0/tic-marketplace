import { getApiBaseUrl } from "@/lib/api";

export const appName = "TIC Marketplace";

export const apiBaseUrl = getApiBaseUrl();

export const routes = {
  home: "/",
  login: "/login",
  dashboard: "/dashboard",
  adminRbac: "/admin/rbac",
  adminTaxonomy: "/admin/taxonomy",
  providerProfile: "/provider/profile",
  professionalProfile: "/professional/profile",
  organizations: "/organizations",
  organization: (id: string) => `/organizations/${id}`,
  organizationMembers: (id: string) => `/organizations/${id}/members`,
  acceptInvitation: "/invitations/accept",
} as const;

export type UserRole = "buyer" | "provider" | "admin";
