"use client";

import { useState } from "react";

import { Container } from "@/components/common/container";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import { hasPermission, MARKETPLACE_FUNCTIONALITIES as M } from "@/features/organizations/utils/permissions";
import { CategoriesPanel } from "@/features/taxonomy/components/categories-panel";
import { IndustriesPanel } from "@/features/taxonomy/components/industries-panel";
import { LocationsPanel } from "@/features/taxonomy/components/locations-panel";
import { ServicesPanel } from "@/features/taxonomy/components/services-panel";
import { StandardsPanel } from "@/features/taxonomy/components/standards-panel";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "categories", label: "Categories", code: M.categories, Panel: CategoriesPanel },
  { key: "services", label: "Services", code: M.services, Panel: ServicesPanel },
  { key: "standards", label: "Standards", code: M.standards, Panel: StandardsPanel },
  { key: "industries", label: "Industries", code: M.industries, Panel: IndustriesPanel },
  { key: "locations", label: "Locations", code: M.locations, Panel: LocationsPanel },
] as const;

export default function TaxonomyAdminPage() {
  const { status, me } = useOrganizations();
  const visibleTabs = tabs.filter((tab) => hasPermission(me?.permissions, tab.code, "view"));
  const [selected, setSelected] = useState<(typeof tabs)[number]["key"] | null>(null);
  const activeTab = visibleTabs.find((tab) => tab.key === selected) ?? visibleTabs[0];

  return (
    <Container className="py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Administration</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">Marketplace taxonomy</h1>
      <p className="mt-2 max-w-3xl text-sm text-slate-600">
        Master data that providers choose from: service categories and services, standards, industries and locations.
        Records that are already in use are deactivated rather than deleted.
      </p>

      <div className="mt-8">
        {status === "loading" ? (
          <LoadingState label="Loading permissions..." />
        ) : status === "error" ? (
          <ErrorState title="Unable to load your permissions" />
        ) : !activeTab ? (
          <ErrorState title="Access denied" description="Your roles do not grant access to the marketplace taxonomy." />
        ) : (
          <>
            <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200" aria-label="Taxonomy sections">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelected(tab.key)}
                  aria-current={tab.key === activeTab.key ? "page" : undefined}
                  className={cn(
                    "-mb-px border-b-2 px-4 py-2 text-sm font-medium whitespace-nowrap transition",
                    tab.key === activeTab.key ? "border-sky-700 text-sky-700" : "border-transparent text-slate-500 hover:text-slate-900",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
            <activeTab.Panel key={activeTab.key} />
          </>
        )}
      </div>
    </Container>
  );
}
