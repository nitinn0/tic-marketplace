"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, Download, FileText, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProviderCard } from "@/components/site";
import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import { api, getApiBaseUrl, getActiveOrganizationId } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { routes } from "@/lib/constants";
import type { MarketplaceProvider, MarketplaceService, MarketplaceServiceDocument } from "@/features/marketplace/types";

type ServiceDetail = MarketplaceService & { providers: MarketplaceProvider[] };

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

async function downloadDocument(document: MarketplaceServiceDocument) {
  const apiBaseUrl = getApiBaseUrl();
  const token = window.localStorage.getItem("tic_access_token");
  if (!apiBaseUrl || !token) {
    window.location.assign(`${routes.login}?next=${encodeURIComponent(window.location.pathname)}`);
    return;
  }
  const headers = new Headers({ Authorization: `Bearer ${token}` });
  const organizationId = getActiveOrganizationId();
  if (organizationId) headers.set("X-Organization-Id", organizationId);

  const response = await fetch(`${apiBaseUrl}/marketplace/documents/${document.id}`, { headers });
  if (response.status === 401) {
    window.location.assign(`${routes.login}?next=${encodeURIComponent(window.location.pathname)}`);
    return;
  }
  if (!response.ok) {
    throw new Error("Unable to download document");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = document.originalName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ServiceDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { activeOrganization } = useOrganizations();
  const isProvider = activeOrganization?.organizationType === "PROVIDER";
  const [service, setService] = useState<ServiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(isAuthenticated());
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .get<ServiceDetail>(`/marketplace/services/${slug}`)
      .then((data) => {
        if (!cancelled) setService(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Service not found");
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (error) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-red-700">{error}</div>;
  }
  if (!service) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-muted-foreground">Loading service…</div>;
  }

  const documents = service.documents ?? [];
  const showLockedDocuments = !loggedIn && Boolean(service.documentsAvailable);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <p className="text-sm text-muted-foreground">{service.categoryPath.join(" / ") || service.categoryName}</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-3xl font-bold">{service.name}</h1>
        <Button asChild variant="cta">
          {isProvider ? (
            <Link href={routes.providerRfqs}>
              Submit quote <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link href={`/rfq/new?service=${service.slug}`}>
              Request Quote <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </Button>
      </div>
      <p className="mt-4 max-w-3xl text-muted-foreground">
        {service.description || "Send one RFQ and matched providers will quote this service."}
      </p>
      {service.postedBy ? (
        <p className="mt-3 text-sm text-slate-700">
          Posted by <span className="font-medium">{service.postedBy.name}</span>
        </p>
      ) : null}

      {loggedIn && documents.length > 0 ? (
        <section className="mt-10 max-w-3xl">
          <h2 className="font-display text-2xl font-bold">Documents</h2>
          <p className="mt-1 text-sm text-muted-foreground">Supporting files from providers for this service.</p>
          {downloadError ? <p className="mt-3 text-sm text-red-700">{downloadError}</p> : null}
          <ul className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {documents.map((document) => (
              <li key={document.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <span className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <FileText className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-900">{document.originalName}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {document.providerName} · {formatBytes(document.sizeBytes)}
                    </span>
                  </span>
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDownloadError(null);
                    void downloadDocument(document).catch((err: unknown) => {
                      setDownloadError(err instanceof Error ? err.message : "Unable to download document");
                    });
                  }}
                >
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  Download
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {showLockedDocuments ? (
        <section className="mt-10 max-w-3xl rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
              <Lock className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900">Documents available after sign-in</h2>
              <p className="mt-1 text-sm text-slate-600">
                Providers attached supporting files to this service. Sign in to view and download them.
              </p>
              <Button asChild className="mt-4" size="sm">
                <Link href={`${routes.login}?next=${encodeURIComponent(`/services/${service.slug}`)}`}>Sign in to view documents</Link>
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <h2 className="mt-12 font-display text-2xl font-bold">Providers for this service</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {service.providers.map((provider) => (
          <ProviderCard key={provider.id} p={provider} />
        ))}
      </div>
      {service.providers.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No public provider lists this service yet. You can still send an RFQ and we will match related providers.
        </p>
      ) : null}
    </div>
  );
}
