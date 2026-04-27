import Link from "next/link";
import { AlertCircle, ShieldCheck, X } from "lucide-react";

import { RecentIngestionJobs } from "@/components/dashboard/RecentIngestionJobs";
import { SourceCard } from "@/components/dashboard/SourceCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ApiError,
  getDocument,
  getDocuments,
  getIngestionJobs,
  healthCheck,
} from "@/lib/api/client";
import {
  formatDate,
  getDocumentHeading,
  getDocumentSnippet,
  getDomainLabel,
  getSourceIdentifier,
  getSourceSystemLabel,
  getSourceTypeLabel,
  isValidDomain,
  isValidSourceType,
} from "@/lib/legal-display";
import type { DocumentRecord } from "@/lib/types";
import { DOMAIN_OPTIONS, SOURCE_TYPE_OPTIONS } from "@/lib/types";

type VaultPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function createDocumentsHref(params: {
  sourceType: string;
  domain: string;
  limit: number;
  doc?: string | null;
}) {
  const urlParams = new URLSearchParams();
  if (isValidSourceType(params.sourceType)) {
    urlParams.set("source_type", params.sourceType);
  }
  if (isValidDomain(params.domain)) {
    urlParams.set("domain", params.domain);
  }
  urlParams.set("limit", String(params.limit));
  if (params.doc) {
    urlParams.set("doc", params.doc);
  }
  return `/dashboard/documents?${urlParams.toString()}`;
}

export default async function VaultPage({ searchParams }: VaultPageProps) {
  const params = await searchParams;
  const sourceType = readSingleValue(params.source_type) || "";
  const domain = readSingleValue(params.domain) || "";
  const selectedDoc = readSingleValue(params.doc) || "";
  const parsedLimit = Number(readSingleValue(params.limit) || "12");
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 5), 30)
    : 12;

  const [healthResult, jobsResult, documentsResult, selectedDocumentResult] =
    await Promise.allSettled([
      healthCheck(),
      getIngestionJobs(5),
      getDocuments({
        limit,
        source_type: isValidSourceType(sourceType) ? sourceType : undefined,
        domain: isValidDomain(domain) ? domain : undefined,
      }),
      selectedDoc
        ? getDocument(selectedDoc, {
            domain: isValidDomain(domain) ? domain : undefined,
          })
        : Promise.resolve(null),
    ]);

  const jobs = jobsResult.status === "fulfilled" ? jobsResult.value.jobs : [];
  const documentsError =
    documentsResult.status === "rejected"
      ? documentsResult.reason instanceof ApiError
        ? documentsResult.reason.message
        : "Documents could not be loaded."
      : null;
  const documents =
    documentsResult.status === "fulfilled"
      ? documentsResult.value.documents
      : [];
  const totalCount =
    documentsResult.status === "fulfilled" ? documentsResult.value.count : 0;
  const selectedDocument =
    selectedDocumentResult.status === "fulfilled" &&
    selectedDocumentResult.value
      ? selectedDocumentResult.value.documents[0] || null
      : documents.find(
          (document) =>
            document.source_id === selectedDoc || document.id === selectedDoc,
        ) || null;
  const isBackendLive =
    healthResult.status === "fulfilled" && healthResult.value.status === "ok";
  const drawerCloseHref = createDocumentsHref({ sourceType, domain, limit });

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-[#1F1D1A] tracking-tight mb-2">
            Vault
          </h1>
          <p className="text-[#63534B] max-w-3xl">
            Inspect stored BWB and Rechtspraak rows from the backend document
            store and open source detail views.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Badge
            variant="outline"
            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] ${
              isBackendLive
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-[#D8D2C8] bg-white text-[#7C746B]"
            }`}
          >
            {isBackendLive ? "Backend Live" : "Backend Offline"}
          </Badge>
          <Badge
            variant="outline"
            className="px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] border-[#D8D2C8] bg-white text-[#63534B]"
          >
            {totalCount} loaded
          </Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,2fr)_360px] gap-8 items-start">
        <div className="space-y-6">
          <Card className="bg-white border-[#D8D2C8] shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-serif text-[#1F1D1A]">
                Live Document Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid md:grid-cols-4 gap-3" method="get">
                <select
                  name="source_type"
                  defaultValue={isValidSourceType(sourceType) ? sourceType : ""}
                  className="h-11 rounded-xl border border-[#D8D2C8] bg-[#F5F5F4] px-3 text-sm text-[#1F1D1A] focus:outline-none focus:ring-1 focus:ring-[#DD3300]/40"
                >
                  <option value="">All sources</option>
                  {SOURCE_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <select
                  name="domain"
                  defaultValue={isValidDomain(domain) ? domain : ""}
                  className="h-11 rounded-xl border border-[#D8D2C8] bg-[#F5F5F4] px-3 text-sm text-[#1F1D1A] focus:outline-none focus:ring-1 focus:ring-[#DD3300]/40"
                >
                  <option value="">All domains</option>
                  {DOMAIN_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <select
                  name="limit"
                  defaultValue={String(limit)}
                  className="h-11 rounded-xl border border-[#D8D2C8] bg-[#F5F5F4] px-3 text-sm text-[#1F1D1A] focus:outline-none focus:ring-1 focus:ring-[#DD3300]/40"
                >
                  {[10, 12, 20, 30].map((option) => (
                    <option key={option} value={option}>
                      {option} documents
                    </option>
                  ))}
                </select>

                <Button className="h-11 bg-[#1F1D1A] text-white hover:bg-[#1F1D1A]/90">
                  Refresh Vault
                </Button>
              </form>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#63534B]">
                <span className="font-medium text-[#1F1D1A]">
                  {isValidSourceType(sourceType)
                    ? getSourceTypeLabel(sourceType)
                    : "All sources"}
                </span>
                <span>·</span>
                <span>
                  {isValidDomain(domain)
                    ? getDomainLabel(domain)
                    : "All domains"}
                </span>
                <span>·</span>
                <span>Showing up to {limit} records</span>
              </div>
            </CardContent>
          </Card>

          {documentsError ? (
            <Card className="bg-white border-[#DD3300]/20 shadow-sm">
              <CardContent className="p-6 flex gap-4">
                <AlertCircle className="w-5 h-5 text-[#DD3300] mt-1 shrink-0" />
                <div>
                  <p className="font-medium text-[#1F1D1A] mb-1">
                    Vault unavailable
                  </p>
                  <p className="text-sm text-[#63534B] leading-6">
                    {documentsError}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {!documentsError && documents.length === 0 ? (
            <Card className="bg-white border-[#D8D2C8] shadow-sm">
              <CardContent className="p-10 text-center">
                <div className="w-16 h-16 bg-[#EEEDE4] rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShieldCheck className="w-8 h-8 text-[#63534B]" />
                </div>
                <h2 className="text-2xl font-serif text-[#1F1D1A] mb-3">
                  No stored documents matched this filter
                </h2>
                <p className="text-[#63534B] max-w-2xl mx-auto leading-7">
                  The backend `/documents` endpoint returned an empty set.
                  Either the database is empty or the current filters are too
                  narrow.
                </p>
              </CardContent>
            </Card>
          ) : null}

          {documents.length > 0 ? (
            <div className="space-y-4">
              {documents.map((document) => (
                <SourceCard
                  key={document.id}
                  item={document}
                  href={createDocumentsHref({
                    sourceType,
                    domain,
                    limit,
                    doc: document.source_id || document.id,
                  })}
                  footerLabel="Preview document"
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card className="bg-white border-[#D8D2C8] shadow-sm">
            <CardHeader className="pb-4 border-b border-[#D8D2C8]/40">
              <CardTitle className="text-lg font-serif text-[#1F1D1A]">
                Vault Posture
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4 text-sm text-[#63534B] leading-7">
              <p>
                This read-only MVP view surfaces stored legal material,
                including legislation chunks and case-law records.
              </p>
              <div className="rounded-xl bg-[#F5F5F4] border border-[#D8D2C8]/60 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[#7C746B] mb-2">
                  Active source mix
                </p>
                <p className="text-[#1F1D1A] font-medium">
                  {
                    documents.filter(
                      (item) => item.source_type === "legislation",
                    ).length
                  }{" "}
                  legislation ·{" "}
                  {
                    documents.filter((item) => item.source_type === "case_law")
                      .length
                  }{" "}
                  case law
                </p>
              </div>
              <div className="flex items-center text-xs text-[#7C746B]">
                <ShieldCheck className="w-4 h-4 mr-2 text-[#BDA989]" />
                Uploads and document generation are not included in this MVP
                scope.
              </div>
            </CardContent>
          </Card>

          <RecentIngestionJobs jobs={jobs} />
        </div>
      </div>

      {selectedDoc ? (
        <DocumentPreviewDrawer
          document={selectedDocument}
          requestedDocument={selectedDoc}
          closeHref={drawerCloseHref}
        />
      ) : null}
    </div>
  );
}

function DocumentPreviewDrawer({
  document,
  requestedDocument,
  closeHref,
}: {
  document: DocumentRecord | null;
  requestedDocument: string;
  closeHref: string;
}) {
  const detailHref = document
    ? `/dashboard/documents/${encodeURIComponent(document.source_id || document.id)}${
        document.domain ? `?domain=${encodeURIComponent(document.domain)}` : ""
      }`
    : null;
  const dateLabel = document?.decision_date
    ? formatDate(document.decision_date)
    : document?.fetched_at
      ? formatDate(document.fetched_at)
      : null;

  return (
    <div className="fixed inset-0 z-40">
      <Link
        href={closeHref}
        aria-label="Close document preview"
        className="absolute inset-0 bg-[#1F1D1A]/20"
      />
      <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l border-[#D8D2C8] bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#D8D2C8] bg-white px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#7C746B]">
              Document preview
            </p>
            <p className="text-sm text-[#63534B]">{requestedDocument}</p>
          </div>
          <Link
            href={closeHref}
            className="rounded-full border border-[#D8D2C8] p-2 text-[#63534B] hover:text-[#DD3300]"
            aria-label="Close preview"
          >
            <X className="h-4 w-4" />
          </Link>
        </div>

        {document ? (
          <div className="space-y-6 px-6 py-6">
            <div>
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="border-[#D8D2C8] bg-white text-[#63534B]"
                >
                  {getSourceSystemLabel(document)}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-[#D8D2C8] bg-[#EEEDE4] text-[#63534B]"
                >
                  {getSourceTypeLabel(document.source_type)}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-[#D8D2C8] bg-[#EEEDE4] text-[#63534B]"
                >
                  {getDomainLabel(document.domain)}
                </Badge>
              </div>
              <h2 className="font-serif text-2xl leading-tight text-[#1F1D1A]">
                {getDocumentHeading(document)}
              </h2>
            </div>

            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-[#7C746B]">
                  Source ID
                </dt>
                <dd className="mt-1 break-words text-[#1F1D1A]">
                  {getSourceIdentifier(document)}
                </dd>
              </div>
              {document.article ? (
                <div>
                  <dt className="text-xs uppercase tracking-[0.16em] text-[#7C746B]">
                    Article
                  </dt>
                  <dd className="mt-1 text-[#1F1D1A]">{document.article}</dd>
                </div>
              ) : null}
              {document.ecli ? (
                <div>
                  <dt className="text-xs uppercase tracking-[0.16em] text-[#7C746B]">
                    ECLI
                  </dt>
                  <dd className="mt-1 break-words text-[#1F1D1A]">
                    {document.ecli}
                  </dd>
                </div>
              ) : null}
              {dateLabel ? (
                <div>
                  <dt className="text-xs uppercase tracking-[0.16em] text-[#7C746B]">
                    Date
                  </dt>
                  <dd className="mt-1 text-[#1F1D1A]">{dateLabel}</dd>
                </div>
              ) : null}
            </dl>

            <div className="rounded-xl border border-[#D8D2C8] bg-[#F5F5F4] p-5">
              <p className="mb-3 text-xs uppercase tracking-[0.16em] text-[#7C746B]">
                Text preview
              </p>
              <p className="whitespace-pre-wrap text-sm leading-7 text-[#4F463F]">
                {getDocumentSnippet(document.text, 2000)}
              </p>
            </div>

            {detailHref ? (
              <Link
                href={detailHref}
                className="inline-flex rounded-full bg-[#1F1D1A] px-4 py-2 text-sm font-medium text-white hover:bg-[#1F1D1A]/90"
              >
                Open full detail
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="px-6 py-10">
            <h2 className="font-serif text-2xl text-[#1F1D1A]">
              Document not found
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#63534B]">
              The requested document is not available in the current filtered
              result set.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
