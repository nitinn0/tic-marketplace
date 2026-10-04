"use client";

import { organizationsService } from "../services/organizations.service";
import { useApiResource } from "./use-api-resource";

export function useOrganizationList() {
  return useApiResource(() => organizationsService.list(), []);
}

export function useOrganizationDetails(organizationId: string) {
  return useApiResource(() => organizationsService.get(organizationId), [organizationId]);
}

/** The caller's own access (roles + permissions) inside the organization. */
export function useOrganizationAccess(organizationId: string) {
  return useApiResource(() => organizationsService.context(organizationId), [organizationId]);
}

export function useOrganizationMembers(organizationId: string, includeRemoved: boolean) {
  return useApiResource(
    () => organizationsService.members(organizationId, includeRemoved),
    [organizationId, includeRemoved],
  );
}

export function useCompatibleRoles(organizationId: string, enabled: boolean) {
  return useApiResource(enabled ? () => organizationsService.compatibleRoles(organizationId) : null, [
    organizationId,
    enabled,
  ]);
}

export function usePendingInvitations(organizationId: string, enabled: boolean) {
  return useApiResource(enabled ? () => organizationsService.invitations(organizationId) : null, [
    organizationId,
    enabled,
  ]);
}
