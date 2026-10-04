"use client";

import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { getActiveOrganizationId, setActiveOrganizationId } from "@/lib/api";

import { organizationsService } from "../services/organizations.service";
import type { MeResponse, OrganizationContext, UserOrganization } from "../types";

export type OrganizationsContextValue = {
  status: "anonymous" | "loading" | "ready" | "error";
  error: string | null;
  me: MeResponse | null;
  /** Memberships the user can see (ACTIVE and SUSPENDED). */
  organizations: UserOrganization[];
  /** Memberships the user can act in. */
  activeMemberships: UserOrganization[];
  activeOrganization: UserOrganization | null;
  /** Effective permissions inside the active organization, as resolved by the backend. */
  activeContext: OrganizationContext | null;
  switching: boolean;
  refresh: () => Promise<void>;
  switchOrganization: (organizationId: string) => Promise<void>;
};

export const OrganizationsContext = createContext<OrganizationsContextValue | null>(null);

function readToken() {
  return typeof window === "undefined" ? null : window.localStorage.getItem("tic_access_token");
}

function pickActiveOrganization(me: MeResponse) {
  const active = (me.organizations ?? []).filter((org) => org.membershipStatus === "ACTIVE");
  const stored = getActiveOrganizationId();
  return (
    active.find((org) => org.id === stored)?.id ??
    active.find((org) => org.id === me.activeOrganizationId)?.id ??
    active[0]?.id ??
    null
  );
}

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [status, setStatus] = useState<OrganizationsContextValue["status"]>("loading");
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeContext, setActiveContext] = useState<OrganizationContext | null>(null);
  const [switching, setSwitching] = useState(false);
  const loadedToken = useRef<string | null | undefined>(undefined);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const token = readToken();
    loadedToken.current = token;
    const current = ++requestId.current;

    if (!token) {
      setActiveOrganizationId(null);
      setMe(null);
      setActiveId(null);
      setActiveContext(null);
      setError(null);
      setStatus("anonymous");
      return;
    }

    setStatus((previous) => (previous === "ready" ? previous : "loading"));
    try {
      const profile = await organizationsService.me();
      if (current !== requestId.current) return;

      const nextActiveId = pickActiveOrganization(profile);
      setActiveOrganizationId(nextActiveId);
      const context = nextActiveId ? await organizationsService.context(nextActiveId).catch(() => null) : null;
      if (current !== requestId.current) return;

      setMe(profile);
      setActiveId(nextActiveId);
      setActiveContext(context);
      setError(null);
      setStatus("ready");
    } catch (err) {
      if (current !== requestId.current) return;
      setError(err instanceof Error ? err.message : "Unable to load your organizations.");
      setStatus("error");
    }
  }, []);

  // Reload whenever the session changes (sign in / sign out happen through client navigation).
  useEffect(() => {
    if (loadedToken.current !== readToken()) {
      void load();
    }
  }, [pathname, load]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === "tic_access_token" || event.key === "tic_active_organization_id") {
        void load();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [load]);

  const switchOrganization = useCallback(async (organizationId: string) => {
    setSwitching(true);
    try {
      // The backend validates membership; the stored id is only a hint for later requests.
      const context = await organizationsService.switch(organizationId);
      setActiveOrganizationId(organizationId);
      setActiveId(organizationId);
      setActiveContext(context);
    } finally {
      setSwitching(false);
    }
  }, []);

  const value = useMemo<OrganizationsContextValue>(() => {
    const organizations = me?.organizations ?? [];
    const activeMemberships = organizations.filter((org) => org.membershipStatus === "ACTIVE");
    return {
      status,
      error,
      me,
      organizations,
      activeMemberships,
      activeOrganization: activeMemberships.find((org) => org.id === activeId) ?? null,
      activeContext: activeContext?.organization.id === activeId ? activeContext : null,
      switching,
      refresh: load,
      switchOrganization,
    };
  }, [status, error, me, activeId, activeContext, switching, load, switchOrganization]);

  return <OrganizationsContext.Provider value={value}>{children}</OrganizationsContext.Provider>;
}
