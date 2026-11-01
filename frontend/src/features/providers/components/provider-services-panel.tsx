"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { routes } from "@/lib/constants";

import { providersService } from "../services/providers.service";
import type { ProviderCatalog, ProviderProfile } from "../types";

const MAX_DOCUMENTS = 5;
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES =
  ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/png,image/jpeg,text/plain";

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProviderServicesPanel({
  organizationId,
  profile,
  onChanged,
  onCreateProfile,
}: {
  organizationId: string;
  profile: ProviderProfile | null;
  onChanged: () => Promise<void>;
  onCreateProfile?: () => void;
}) {
  const [catalog, setCatalog] = useState<ProviderCatalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [documents, setDocuments] = useState<File[]>([]);
  const [documentsKey, setDocumentsKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    providersService
      .catalog(organizationId)
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setCatalogError(err instanceof Error ? err.message : "Unable to load categories");
      });
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  const posted = profile?.capabilities.services ?? [];

  const onDocumentsChange = (fileList: FileList | null) => {
    setError(null);
    const next = Array.from(fileList ?? []);
    if (next.length > MAX_DOCUMENTS) {
      setError(`You can upload at most ${MAX_DOCUMENTS} documents`);
      setDocuments(next.slice(0, MAX_DOCUMENTS));
      return;
    }
    const oversized = next.find((file) => file.size > MAX_DOCUMENT_BYTES);
    if (oversized) {
      setError(`“${oversized.name}” must be 10 MB or smaller`);
      return;
    }
    setDocuments(next);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!profile) {
      setError("Create your provider profile on Overview before posting a service.");
      return;
    }
    if (documents.length === 0) {
      setError("Upload at least one supporting document. Buyers can download it after they sign in.");
      return;
    }
    setSubmitting(true);
    try {
      await providersService.publishService(organizationId, {
        categoryId,
        name: name.trim(),
        description: description.trim() || undefined,
        documents,
      });
      setName("");
      setDescription("");
      setDocuments([]);
      setDocumentsKey((key) => key + 1);
      setNotice("Service posted with documents. Logged-in buyers can view the files on the service page.");
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to post the service");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (serviceId: string, serviceName: string) => {
    setError(null);
    setNotice(null);
    try {
      await providersService.removeService(organizationId, serviceId);
      setNotice(`${serviceName} was removed from your profile.`);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove the service");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Post a service</h2>
        <p className="mt-1 text-sm text-slate-500">
          Buyers see this listing with your organization as the provider who posted it. Supporting documents are
          required and only visible after a buyer signs in.
        </p>
        {!profile ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-medium">Create your provider profile first</p>
            <p className="mt-1 text-amber-900/80">
              Open Overview, fill the profile fields, and click Create profile. Then you can post services here.
            </p>
            {onCreateProfile ? (
              <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onCreateProfile}>
                Go to Overview
              </Button>
            ) : null}
          </div>
        ) : null}
        <form className="mt-6 space-y-4" onSubmit={(event) => void onSubmit(event)}>
          <Field label="Category" htmlFor="service-category">
            <Select
              id="service-category"
              required
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              disabled={!catalog}
            >
              <option value="">Select a category</option>
              {(catalog?.categories ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {"\u00a0\u00a0".repeat(category.depth)}
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Service name" htmlFor="service-name">
            <Input id="service-name" required minLength={2} maxLength={160} value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Description" htmlFor="service-description" hint="Shown on the public service page.">
            <Textarea id="service-description" maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} />
          </Field>
          <Field
            label="Supporting documents"
            htmlFor="service-documents"
            hint="Required. PDF, Word, Excel, PNG, JPEG or text — up to 5 files, 10 MB each. Visible to logged-in buyers only."
          >
            <Input
              key={documentsKey}
              id="service-documents"
              type="file"
              required
              multiple
              accept={ACCEPTED_TYPES}
              onChange={(event) => onDocumentsChange(event.target.files)}
            />
          </Field>
          {documents.length > 0 ? (
            <ul className="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {documents.map((file) => (
                <li key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
                  <span className="truncate font-medium">{file.name}</span>
                  <span className="ml-auto shrink-0 text-xs text-slate-500">{formatBytes(file.size)}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {catalogError ? <p className="text-sm text-red-700">{catalogError}</p> : null}
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}
          <Button type="submit" disabled={submitting || !profile} title={!profile ? "Create your provider profile on Overview first" : undefined}>
            {submitting ? "Posting…" : !profile ? "Create profile first" : "Post service"}
          </Button>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Your services</h2>
        <p className="mt-1 text-sm text-slate-500">{profile?.organization.displayName ?? "This organization"} is listed on these services.</p>
        {posted.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">No services posted yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {posted.map((service) => (
              <li key={service.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <span>
                  <Link href={routes.service(service.slug)} className="font-medium text-slate-900 hover:text-sky-700">
                    {service.name}
                  </Link>
                  <span className="mt-1 block text-sm text-slate-500">{service.categoryPath.join(" / ") || "Uncategorized"}</span>
                  {service.documents && service.documents.length > 0 ? (
                    <span className="mt-1 block text-xs text-slate-500">
                      {service.documents.length} document{service.documents.length === 1 ? "" : "s"} attached
                    </span>
                  ) : null}
                </span>
                <Button type="button" variant="outline" size="sm" onClick={() => void remove(service.id, service.name)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
