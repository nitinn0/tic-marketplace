"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/common/container";
import { getStoredSession, clearSession } from "@/lib/auth";
import { api } from "@/lib/api";
import { ActiveOrganizationCard } from "@/features/organizations/components/active-organization-card";

function StatCard({ title, value, tone = "default" }: { title: string; value: string; tone?: "default" | "success" | "warning" }) {
  const tones = {
    default: "border-slate-200 bg-slate-50 text-slate-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
  };

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em]">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

type UserProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: string;
};

type RoleSummary = {
  id: string;
  name: string;
  code: string;
};

type MeResponse = {
  user: UserProfile;
  roles: RoleSummary[];
  permissions: Array<{
    functionalityCode: string;
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canApprove: boolean;
    canConfigure: boolean;
  }>;
};

export default function DashboardPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMe = async () => {
      try {
        const session = getStoredSession();
        if (!session) {
          setError("You are not signed in.");
          setLoading(false);
          return;
        }

        const payload = await api.get<MeResponse>("/auth/me");
        setMe(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load dashboard.");
      } finally {
        setLoading(false);
      }
    };

    void loadMe();
  }, []);

  const totalPermissions = useMemo(() => (me?.permissions.length ?? 0), [me]);
  const activePermissions = useMemo(
    () => (me?.permissions.filter((entry) => entry.canView || entry.canCreate || entry.canEdit).length ?? 0),
    [me],
  );

  const handleLogout = () => {
    clearSession();
    window.location.href = "/login";
  };

  return (
    <Container className="py-12">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
            Workspace
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Dashboard</h1>
        </div>
        <Button variant="secondary" type="button" onClick={handleLogout}>Log out</Button>
      </div>

      {loading ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
          Loading access profile...
        </div>
      ) : error ? (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          {error}
        </div>
      ) : me ? (
        <>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <StatCard title="User" value={`${me.user.firstName} ${me.user.lastName}`} />
            <StatCard title="Roles" value={String(me.roles.length)} tone="success" />
            <StatCard title="Permissions" value={String(totalPermissions)} tone="warning" />
          </div>

          <div className="mt-8">
            <ActiveOrganizationCard />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Account overview
              </p>
              <div className="mt-6 space-y-4 text-sm text-slate-700">
                <div className="flex justify-between border-b border-slate-100 pb-3">
                  <span>Email</span>
                  <span className="font-medium text-slate-900">{me.user.email}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-3">
                  <span>Status</span>
                  <span className="font-medium text-slate-900">{me.user.status}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-3">
                  <span>Phone</span>
                  <span className="font-medium text-slate-900">{me.user.phone ?? "Not provided"}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span>Active access</span>
                  <span className="font-medium text-slate-900">{activePermissions} rights</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Roles
              </p>
              <div className="mt-5 space-y-3">
                {me.roles.length > 0 ? (
                  me.roles.map((role) => (
                    <div key={role.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="font-semibold text-slate-900">{role.name}</p>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{role.code}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                    No roles assigned yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Permissions
            </p>
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Functionality</th>
                    <th className="px-4 py-3 font-medium">View</th>
                    <th className="px-4 py-3 font-medium">Create</th>
                    <th className="px-4 py-3 font-medium">Edit</th>
                    <th className="px-4 py-3 font-medium">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {me.permissions.length > 0 ? (
                    me.permissions.map((permission) => (
                      <tr key={permission.functionalityCode}>
                        <td className="px-4 py-3 font-medium text-slate-800">{permission.functionalityCode}</td>
                        <td className="px-4 py-3">{permission.canView ? "✅" : "—"}</td>
                        <td className="px-4 py-3">{permission.canCreate ? "✅" : "—"}</td>
                        <td className="px-4 py-3">{permission.canEdit ? "✅" : "—"}</td>
                        <td className="px-4 py-3">{permission.canDelete ? "✅" : "—"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                        No permissions assigned.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </Container>
  );
}
