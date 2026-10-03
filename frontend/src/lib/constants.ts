export const appName = "TIC Marketplace";

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

export const routes = {
  home: "/",
  dashboard: "/dashboard",
} as const;

export type UserRole = "buyer" | "provider" | "admin";
