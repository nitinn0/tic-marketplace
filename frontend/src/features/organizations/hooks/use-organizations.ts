"use client";

import { useContext } from "react";

import { OrganizationsContext } from "../components/organization-provider";

export function useOrganizations() {
  const context = useContext(OrganizationsContext);
  if (!context) {
    throw new Error("useOrganizations must be used inside <OrganizationProvider>");
  }
  return context;
}
