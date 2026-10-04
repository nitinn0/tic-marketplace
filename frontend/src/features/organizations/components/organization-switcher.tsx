"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Building2, Check, ChevronsUpDown, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

import { useOrganizations } from "../hooks/use-organizations";
import { organizationTypeLabels } from "../utils/labels";

const ORGANIZATION_PATH = /^\/organizations\/[0-9a-f-]{36}(\/.*)?$/i;

/** Rendered only when the user can act in more than one organization. */
export function OrganizationSwitcher() {
  const { activeMemberships, activeOrganization, switchOrganization, switching } = useOrganizations();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (activeMemberships.length <= 1) {
    return null;
  }

  const handleSelect = async (organizationId: string) => {
    setOpen(false);
    if (organizationId === activeOrganization?.id) return;
    setError(null);
    try {
      await switchOrganization(organizationId);
      // Keep the user on the equivalent page of the newly selected organization.
      const match = pathname.match(ORGANIZATION_PATH);
      if (match) {
        router.push(`/organizations/${organizationId}${match[1] ?? ""}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to switch organization");
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Switch organization"
        className="flex max-w-[16rem] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-left text-sm shadow-sm transition hover:border-slate-300"
      >
        {switching ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-sky-700" aria-hidden="true" />
        ) : (
          <Building2 className="h-4 w-4 shrink-0 text-sky-700" aria-hidden="true" />
        )}
        <span className="min-w-0">
          <span className="block truncate font-medium text-slate-900">
            {activeOrganization?.displayName ?? "Select organization"}
          </span>
          {activeOrganization ? (
            <span className="block text-xs text-slate-500">{organizationTypeLabels[activeOrganization.organizationType]}</span>
          ) : null}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label="Organizations"
          className="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {activeMemberships.map((organization) => {
            const selected = organization.id === activeOrganization?.id;
            return (
              <li key={organization.id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => void handleSelect(organization.id)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition hover:bg-slate-50",
                    selected && "bg-sky-50",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-900">{organization.displayName}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {organizationTypeLabels[organization.organizationType]}
                      {organization.roles.length > 0 ? ` · ${organization.roles.map((role) => role.name).join(", ")}` : ""}
                    </span>
                  </span>
                  {selected ? <Check className="h-4 w-4 text-sky-700" aria-hidden="true" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {error ? (
        <p role="alert" className="absolute right-0 mt-2 w-72 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
