"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api";

export type EmailChangeRequest = {
  id: string;
  status: "OTP_PENDING" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "CANCELLED";
  currentEmail: string;
  newEmail: string;
  createdAt: string;
  otpVerifiedAt: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    status: string;
  };
  reviewedBy: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
};

function formatWhen(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

export function EmailChangeRequestsCard({
  title = "Email change requests",
  defaultFilter = "PENDING_APPROVAL",
}: {
  title?: string;
  defaultFilter?: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "";
}) {
  const [filter, setFilter] = useState<"PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "">(defaultFilter);
  const [requests, setRequests] = useState<EmailChangeRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    const query = filter ? `?status=${filter}` : "";
    api
      .get<{ requests: EmailChangeRequest[] }>(`/admin/email-changes${query}`)
      .then((data) => {
        setRequests(data.requests);
        setError(null);
      })
      .catch((err: unknown) => {
        // Older backends may not expose this route yet — treat as an empty queue.
        if (err instanceof ApiError && err.status === 404) {
          setRequests([]);
          setError(null);
          return;
        }
        if (err instanceof Error && /Cannot GET|Cannot POST/i.test(err.message)) {
          setRequests([]);
          setError(null);
          return;
        }
        setError(err instanceof Error ? err.message : "Unable to load email change requests");
      });
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id: string, action: "approve" | "reject") => {
    setBusy(`${action}-${id}`);
    setError(null);
    try {
      await api.post(`/admin/email-changes/${id}/${action}`, action === "reject" ? { note: "Rejected by super admin" } : {});
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Platform</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">Approve or reject verified email change requests from buyers and providers.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["PENDING_APPROVAL", "APPROVED", "REJECTED", ""] as const).map((value) => (
            <button
              key={value || "ALL"}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                filter === value ? "bg-sky-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {value === "PENDING_APPROVAL" ? "Pending" : value === "APPROVED" ? "Approved" : value === "REJECTED" ? "Rejected" : "All"}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <ul className="mt-5 space-y-3">
        {requests.map((request) => (
          <li key={request.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">
                  {request.user.firstName} {request.user.lastName}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  <span className="font-medium text-slate-800">{request.currentEmail}</span>
                  {" → "}
                  <span className="font-medium text-slate-800">{request.newEmail}</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {request.status.replaceAll("_", " ")} · requested {formatWhen(request.createdAt)}
                  {request.reviewedBy
                    ? ` · reviewed by ${request.reviewedBy.firstName} ${request.reviewedBy.lastName}`
                    : null}
                </p>
              </div>
              {request.status === "PENDING_APPROVAL" ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy === `approve-${request.id}`}
                    onClick={() => void act(request.id, "approve")}
                  >
                    {busy === `approve-${request.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Approve
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy === `reject-${request.id}`}
                    onClick={() => void act(request.id, "reject")}
                  >
                    {busy === `reject-${request.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                    Reject
                  </Button>
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {requests.length === 0 ? <p className="mt-4 text-sm text-slate-500">No email change requests in this filter.</p> : null}
    </section>
  );
}
