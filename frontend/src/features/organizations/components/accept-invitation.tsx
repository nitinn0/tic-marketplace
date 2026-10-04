"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";

import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { Button } from "@/components/ui/button";
import { isAuthenticated } from "@/lib/auth";
import { routes } from "@/lib/constants";

import { useApiResource } from "../hooks/use-api-resource";
import { useOrganizations } from "../hooks/use-organizations";
import { organizationsService } from "../services/organizations.service";
import { formatDate, organizationTypeLabels, titleCase } from "../utils/labels";

export function AcceptInvitation() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const { me, refresh, switchOrganization } = useOrganizations();
  const preview = useApiResource(token ? () => organizationsService.previewInvitation(token) : null, [token]);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return <ErrorState title="Invalid invitation link" description="The link is missing its invitation token." />;
  }
  if (preview.loading) {
    return <LoadingState label="Checking invitation..." />;
  }
  if (preview.error || !preview.data) {
    return <ErrorState title="Invitation not found" description={preview.error ?? "This invitation link is not valid."} />;
  }

  const invitation = preview.data;
  const signedIn = isAuthenticated();
  const emailMismatch = signedIn && me && me.user.email.toLowerCase() !== invitation.email.toLowerCase();
  const nextUrl = `${routes.acceptInvitation}?token=${encodeURIComponent(token)}`;

  const accept = async () => {
    setAccepting(true);
    setError(null);
    try {
      const result = await organizationsService.acceptInvitation(token);
      await refresh();
      await switchOrganization(result.organization.id).catch(() => undefined);
      router.push(routes.organization(result.organization.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to accept invitation");
      setAccepting(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
        <MailCheck className="h-6 w-6" aria-hidden="true" />
      </div>
      <h1 className="mt-5 text-2xl font-bold text-slate-900">Join {invitation.organization.displayName}</h1>
      <p className="mt-2 text-sm text-slate-600">
        {invitation.invitedBy ? `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName} invited ` : "You were invited "}
        <span className="font-medium text-slate-900">{invitation.email}</span> to join this{" "}
        {organizationTypeLabels[invitation.organization.organizationType].toLowerCase()} organization as{" "}
        <span className="font-medium text-slate-900">{invitation.role.name}</span>.
      </p>

      {invitation.status !== "PENDING" ? (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          This invitation is {titleCase(invitation.status).toLowerCase()} and can no longer be accepted.
        </p>
      ) : !signedIn ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-slate-600">Sign in as {invitation.email} to accept.</p>
          <Button asChild>
            <Link href={`${routes.login}?next=${encodeURIComponent(nextUrl)}`}>Sign in to accept</Link>
          </Button>
        </div>
      ) : emailMismatch ? (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          You are signed in as {me.user.email}. Sign in as {invitation.email} to accept this invitation.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          <p className="text-xs text-slate-500">Expires {formatDate(invitation.expiresAt)}</p>
          <Button type="button" onClick={() => void accept()} disabled={accepting}>
            {accepting ? "Joining..." : "Accept invitation"}
          </Button>
        </div>
      )}

      {error ? (
        <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
