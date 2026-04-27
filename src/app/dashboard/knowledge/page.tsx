import Link from "next/link";
import { AlertCircle, Database, Search } from "lucide-react";

import { RecentIngestionJobs } from "@/components/dashboard/RecentIngestionJobs";
import { SourceCard } from "@/components/dashboard/SourceCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  healthCheck,
  getIngestionJobs,
  searchDocuments,
  ApiError,
} from "@/lib/api/client";
import {
  formatDate,
  getDocumentHeading,
  getDocumentSnippet,
  getDomainLabel,
  getSourceTypeLabel,
  isValidDomain,
  isValidSourceType,
} from "@/lib/legal-display";
import { DOMAIN_OPTIONS, SOURCE_TYPE_OPTIONS } from "@/lib/types";

type KnowledgePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function KnowledgePage({
  searchParams,
}: KnowledgePageProps) {
  const params = await searchParams;
  const query = (readSingleValue(params.q) || "").trim();
  const sourceType = readSingleValue(params.source_type) || "";
  const domain = readSingleValue(params.domain) || "";
  const parsedLimit = Number(readSingleValue(params.limit) || "8");
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 3), 12)
    : 8;

  const [healthResult, jobsResult, searchResult] = await Promise.allSettled([
    healthCheck(),
    getIngestionJobs(5),
    query
      ? searchDocuments({
          q: query,
          limit,
          source_type: isValidSourceType(sourceType) ? sourceType : undefined,
          domain: isValidDomain(domain) ? domain : undefined,
        })
      : Promise.resolve(null),
  ]);

  const jobs = jobsResult.status === "fulfilled" ? jobsResult.value.jobs : [];
  const searchError =
    searchResult.status === "rejected"
      ? searchResult.reason instanceof ApiError
        ? searchResult.reason.message
        : "Search could not be completed."
      : null;
  const results =
    searchResult.status === "fulfilled" && searchResult.value
      ? searchResult.value.results
      : [];
  const isBackendLive =
    healthResult.status === "fulfilled" && healthResult.value.status === "ok";

  const lawCount = results.filter(
    (item) => item.source_type === "legislation",
  ).length;
  const caseLawCount = results.filter(
    (item) => item.source_type === "case_law",
  ).length;
  const activeDomainLabel = isValidDomain(domain)
    ? getDomainLabel(domain)
    : "all domains";
  const broaderSearchParams = new URLSearchParams();
  if (query) {
    broaderSearchParams.set("q", query);
  }
  if (isValidSourceType(sourceType)) {
    broaderSearchParams.set("source_type", sourceType);
  }
  broaderSearchParams.set("limit", String(limit));
  const broaderSearchHref = `/dashboard/knowledge?${broaderSearchParams.toString()}`;

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-[#1F1D1A] tracking-tight mb-2">
            Knowledge Base
          </h1>
          <p className="text-[#63534B] max-w-3xl">
            Search the live Veridicta retrieval layer across curated Dutch
            legislation and case law already stored in the backend.
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
            {jobs.length} recent jobs
          </Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,2fr)_360px] gap-8 items-start">
        <div className="space-y-6">
          <Card className="bg-white border-[#D8D2C8] shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-serif text-[#1F1D1A]">
                Live Legal Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" method="get">
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#BDA989]" />
                  <input
                    type="text"
                    name="q"
                    defaultValue={query}
                    placeholder="Search Dutch legal sources, for example: huurcontract, ontslag, bezwaar..."
                    className="w-full bg-[#F5F5F4] border border-[#D8D2C8] text-base placeholder:text-[#7C746B] text-[#1F1D1A] pl-12 pr-4 py-4 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#DD3300]/40"
                  />
                </div>

                <div className="grid md:grid-cols-4 gap-3">
                  <select
                    name="source_type"
                    defaultValue={
                      isValidSourceType(sourceType) ? sourceType : ""
                    }
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
                    {[5, 8, 10, 12].map((option) => (
                      <option key={option} value={option}>
                        {option} results
                      </option>
                    ))}
                  </select>

                  <Button className="h-11 bg-[#1F1D1A] text-white hover:bg-[#1F1D1A]/90">
                    Search
                  </Button>
                </div>
              </form>

              <div className="flex flex-wrap gap-2 mt-4">
                {["huurcontract", "ontslag", "bezwaar", "ECLI"].map((term) => (
                  <Link
                    key={term}
                    href={`/dashboard/knowledge?q=${encodeURIComponent(term)}&limit=${limit}`}
                    className="inline-flex items-center rounded-full border border-[#D8D2C8] bg-[#F5F5F4] px-3 py-1.5 text-xs font-medium text-[#63534B] hover:border-[#DD3300]/30 hover:text-[#DD3300] transition-colors"
                  >
                    {term}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {query ? (
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="bg-[#1F1D1A] border-none text-white shadow-sm">
                <CardContent className="p-6">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/60 mb-2">
                    Search Query
                  </p>
                  <p className="text-2xl font-serif">{query}</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-[#D8D2C8] shadow-sm">
                <CardContent className="p-6">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#7C746B] mb-2">
                    Legislation Hits
                  </p>
                  <p className="text-2xl font-serif text-[#1F1D1A]">
                    {lawCount}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-white border-[#D8D2C8] shadow-sm">
                <CardContent className="p-6">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#7C746B] mb-2">
                    Case Law Hits
                  </p>
                  <p className="text-2xl font-serif text-[#1F1D1A]">
                    {caseLawCount}
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {searchError ? (
            <Card className="bg-white border-[#DD3300]/20 shadow-sm">
              <CardContent className="p-6 flex gap-4">
                <AlertCircle className="w-5 h-5 text-[#DD3300] mt-1 shrink-0" />
                <div>
                  <p className="font-medium text-[#1F1D1A] mb-1">
                    Search unavailable
                  </p>
                  <p className="text-sm text-[#63534B] leading-6">
                    {searchError}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {!query ? (
            <Card className="bg-white border-[#D8D2C8] shadow-sm">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-[#EEEDE4] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Database className="w-8 h-8 text-[#63534B]" />
                </div>
                <h2 className="text-2xl font-serif text-[#1F1D1A] mb-3">
                  Search the live Dutch legal corpus
                </h2>
                <p className="text-[#63534B] max-w-2xl mx-auto leading-7">
                  Enter a query to search stored legislation and Rechtspraak
                  material through the live backend retrieval endpoint.
                </p>
              </CardContent>
            </Card>
          ) : null}

          {query && !searchError && results.length === 0 ? (
            <Card className="bg-white border-[#D8D2C8] shadow-sm">
              <CardContent className="p-8 text-center">
                <h2 className="text-2xl font-serif text-[#1F1D1A] mb-3">
                  No matches for &quot;{query}&quot; in {activeDomainLabel}
                </h2>
                <p className="text-[#63534B] leading-7 max-w-2xl mx-auto">
                  The backend returned zero hits for this query and filter
                  combination. Try a shorter legal term or broaden the domain
                  filter.
                </p>
                {isValidDomain(domain) ? (
                  <Link
                    href={broaderSearchHref}
                    className="mt-5 inline-flex rounded-full border border-[#D8D2C8] bg-[#F5F5F4] px-4 py-2 text-sm font-medium text-[#63534B] hover:border-[#DD3300]/30 hover:text-[#DD3300] transition-colors"
                  >
                    Try broader domain
                  </Link>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {results.length > 0 ? (
            <div className="space-y-4">
              {results.map((result) => (
                <SourceCard
                  key={result.id}
                  item={result}
                  href={`/dashboard/documents/${encodeURIComponent(
                    result.source_id || result.id,
                  )}${result.domain ? `?domain=${encodeURIComponent(result.domain)}` : ""}`}
                  footerLabel="Open source detail"
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card className="bg-white border-[#D8D2C8] shadow-sm">
            <CardHeader className="pb-4 border-b border-[#D8D2C8]/40">
              <CardTitle className="text-lg font-serif text-[#1F1D1A]">
                Search Context
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4 text-sm text-[#63534B] leading-7">
              <p>
                Source filter:{" "}
                <span className="font-medium text-[#1F1D1A]">
                  {isValidSourceType(sourceType)
                    ? getSourceTypeLabel(sourceType)
                    : "All sources"}
                </span>
              </p>
              <p>
                Domain filter:{" "}
                <span className="font-medium text-[#1F1D1A]">
                  {isValidDomain(domain)
                    ? getDomainLabel(domain)
                    : "All domains"}
                </span>
              </p>
              <p>
                Result limit:{" "}
                <span className="font-medium text-[#1F1D1A]">{limit}</span>
              </p>
              {results[0] ? (
                <div className="rounded-xl bg-[#F5F5F4] border border-[#D8D2C8]/60 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[#7C746B] mb-2">
                    Top hit preview
                  </p>
                  <p className="text-[#1F1D1A] font-medium mb-2">
                    {getDocumentHeading(results[0])}
                  </p>
                  <p className="text-sm text-[#63534B]">
                    {getDocumentSnippet(results[0].text, 160)}
                  </p>
                </div>
              ) : null}
              {jobs[0] ? (
                <div className="rounded-xl bg-[#1F1D1A] p-4 text-white">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/60 mb-2">
                    Latest ingestion
                  </p>
                  <p className="font-medium">{jobs[0].job_type}</p>
                  <p className="text-sm text-white/70 mt-1">
                    {getDomainLabel(jobs[0].domain)} ·{" "}
                    {formatDate(jobs[0].started_at)}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <RecentIngestionJobs jobs={jobs} />
        </div>
      </div>
    </div>
  );
}
