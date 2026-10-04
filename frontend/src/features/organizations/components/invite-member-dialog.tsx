"use client";

import { useState, type FormEvent } from "react";
import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";

import { organizationsService } from "../services/organizations.service";
import type { CompatibleRole, InviteMemberResult } from "../types";

export function InviteMemberDialog({
  open,
  organizationId,
  organizationName,
  roles,
  onClose,
  onInvited,
}: {
  open: boolean;
  organizationId: string;
  organizationName: string;
  roles: CompatibleRole[];
  onClose: () => void;
  onInvited: () => void;
}) {
  const assignable = roles.filter((role) => role.assignable);
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InviteMemberResult | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedRoleId = roleId || assignable[0]?.id || "";

  const close = () => {
    setEmail("");
    setRoleId("");
    setError(null);
    setResult(null);
    setCopied(false);
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const invited = await organizationsService.invite(organizationId, { email: email.trim(), roleId: selectedRoleId });
      setResult(invited);
      onInvited();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send invitation");
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = async () => {
    if (!result?.devAcceptUrl) return;
    await navigator.clipboard.writeText(result.devAcceptUrl);
    setCopied(true);
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title={result ? "Invitation sent" : "Invite a member"}
      description={result ? undefined : `Invite someone to join ${organizationName}.`}
    >
      {result ? (
        <div className="space-y-4 text-sm">
          <p className="text-slate-700">
            {result.emailDelivered
              ? `An invitation was sent to ${result.invitation.email} as ${result.invitation.role.name}.`
              : `The invitation for ${result.invitation.email} was created, but the email could not be delivered.`}
          </p>
          {result.devAcceptUrl ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">Development only</p>
              <p className="mt-1 text-amber-900">Email delivery is logged locally. Share this link to accept:</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded bg-white px-2 py-1 text-xs text-slate-800">
                  {result.devAcceptUrl}
                </code>
                <Button type="button" variant="outline" size="sm" onClick={() => void copyLink()}>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          ) : null}
          <div className="flex justify-end">
            <Button type="button" onClick={close}>
              Done
            </Button>
          </div>
        </div>
      ) : assignable.length === 0 ? (
        <p className="text-sm text-slate-600">There are no roles you are allowed to grant in this organization.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Email address" htmlFor="invite-email">
            <Input
              id="invite-email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="colleague@company.com"
            />
          </Field>
          <Field label="Role" htmlFor="invite-role" hint="Only roles compatible with this organization that you may grant.">
            <Select id="invite-role" value={selectedRoleId} onChange={(event) => setRoleId(event.target.value)}>
              {assignable.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </Select>
          </Field>
          {error ? (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={close} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !selectedRoleId}>
              {submitting ? "Sending..." : "Send invitation"}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
