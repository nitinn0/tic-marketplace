import { getApiBaseUrl } from "@/lib/api";

export const appName = "TIC Marketplace";

export const apiBaseUrl = getApiBaseUrl();

export const routes = {
  home: "/",
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  dashboard: "/dashboard",
  accountSettings: "/account/settings",
  adminRbac: "/admin/rbac",
  adminTaxonomy: "/admin/taxonomy",
  adminVerification: "/admin/verification",
  providerProfile: "/provider/profile",
  providerDashboard: "/provider/dashboard",
  professionalProfile: "/professional/profile",
  organizations: "/organizations",
  organization: (id: string) => `/organizations/${id}`,
  organizationMembers: (id: string) => `/organizations/${id}/members`,
  acceptInvitation: "/invitations/accept",
  services: "/services",
  service: (slug: string) => `/services/${slug}`,
  providers: "/providers",
  provider: (id: string) => `/providers/${id}`,
  professionals: "/professionals",
  professional: (id: string) => `/professionals/${id}`,
  rfqNew: "/rfq/new",
  rfqs: "/rfq",
  rfq: (id: string) => `/rfq/${id}`,
  providerRfqs: "/provider/rfqs",
  providerRfq: (id: string) => `/provider/rfqs?rfq=${encodeURIComponent(id)}`,
  messages: "/messages",
  message: (id: string) => `/messages/${id}`,
  join: "/join",
  howItWorks: "/how-it-works",
} as const;

export type UserRole = "buyer" | "provider" | "admin";
