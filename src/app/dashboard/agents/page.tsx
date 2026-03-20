import Link from "next/link";
import {
  Bot,
  Briefcase,
  FileText,
  Scale,
  Search,
  Send,
  Sparkles,
} from "lucide-react";

import { SourceCard } from "@/components/dashboard/SourceCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ApiError, searchDocuments } from "@/lib/api";
import { getDomainLabel, isValidDomain } from "@/lib/legal-display";
import { DOMAIN_OPTIONS } from "@/lib/types";

const SUGGESTED_PROMPTS = [
  {
    domain: "tenancy_law",
    icon: FileText,
    prompt: "huurcontract",
    description: "Broad tenancy-law query with live matches",
  },
  {
    domain: "employment_law",
    icon: Briefcase,
    prompt: "ontslag",
    description: "Employment query that reliably returns case law",
  },
  {
    domain: "administrative_law",
    icon: Scale,
    prompt: "bezwaar",
    description: "Administrative-law entry point with current coverage",
  },
  {
    domain: "sme_business_law",
    icon: Search,
    prompt: "bestuurder",
    description: "SME and company-law sources with stronger recall",
  },
] as const;

type AssistantPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type SearchResponseState =
  | Awaited<ReturnType<typeof searchDocuments>>
  | { error: string };

function readSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function loadSearchState(query: string, domain: string | undefined, limit: number) {
  return searchDocuments({
    q: query,
    domain,
    limit,
  }).catch((error): SearchResponseState => ({
    error:
      error instanceof ApiError
        ? error.message
        : "The assistant could not retrieve grounded results.",
  }));
}

function buildAssistantHref(query: string, domain?: string) {
  const params = new URLSearchParams({
    q: query,
    limit: "5",
  });

  if (domain) {
    params.set("domain", domain);
  }

  return `/dashboard/agents?${params.toString()}`;
}

export default async function AssistantPage({ searchParams }: AssistantPageProps) {
  const params = await searchParams;
  const query = (readSingleValue(params.q) || "").trim();
  const rawDomain = readSingleValue(params.domain) || "";
  const domain = isValidDomain(rawDomain) ? rawDomain : undefined;
  const parsedLimit = Number(readSingleValue(params.limit) || "5");
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 3), 8) : 5;

  const searchResult = query
    ? await loadSearchState(query, domain, limit)
    : null;
  const broaderSearchResult =
    query &&
    domain &&
    searchResult &&
    !("error" in searchResult) &&
    searchResult.results.length === 0
      ? await loadSearchState(query, undefined, limit)
      : null;
  const filteredResults = searchResult && "results" in searchResult ? searchResult.results : [];
  const broaderResults =
    broaderSearchResult && "results" in broaderSearchResult ? broaderSearchResult.results : [];
  const shouldShowBroaderResults = Boolean(domain) && filteredResults.length === 0 && broaderResults.length > 0;
  const results = shouldShowBroaderResults ? broaderResults : filteredResults;

  const searchError =
    searchResult && "error" in searchResult ? searchResult.error : null;
  const domainsFound = Array.from(new Set(results.map((item) => item.domain).filter(Boolean)));
  const hasActiveDomainFilter = Boolean(domain);

  return (
    <div className="max-w-5xl mx-auto pb-12 min-h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-serif text-[#1F1D1A] tracking-tight mb-2 flex items-center">
            <Bot className="w-8 h-8 mr-3 text-[#BDA989]" /> Source-Backed Assistant
          </h1>
          <p className="text-[#63534B] max-w-3xl">
            This assistant is retrieval-first. Ask a legal question and it will return the strongest matching backend sources instead of inventing a freeform answer.
          </p>
        </div>
      </div>

      <Card className="flex-1 bg-white border-[#D8D2C8] shadow-sm flex flex-col overflow-hidden">
        <CardContent className="flex-1 p-8 overflow-y-auto">
          {!query ? (
            <div className="flex flex-col items-center justify-center text-center h-full">
              <div className="w-16 h-16 bg-[#EEEDE4] rounded-2xl flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8 text-[#DD3300]" />
              </div>
              <h2 className="text-xl font-serif text-[#1F1D1A] mb-2">
                Ask a grounded legal question
              </h2>
              <p className="text-[#63534B] max-w-md mx-auto mb-8">
                The assistant uses the real `/search` endpoint and returns top matching stored sources with metadata and snippets.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 w-full max-w-3xl text-left">
                {SUGGESTED_PROMPTS.map((item) => (
                  <Link
                    key={item.prompt}
                    href={buildAssistantHref(item.prompt)}
                    className="p-4 rounded-xl border border-[#D8D2C8] bg-[#F5F5F4] hover:bg-white hover:border-[#DD3300]/30 hover:shadow-sm transition-all text-left flex flex-col h-full group"
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <item.icon className="w-4 h-4 text-[#BDA989] group-hover:text-[#DD3300] transition-colors" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#63534B]">
                        Focus: {getDomainLabel(item.domain)}
                      </span>
                    </div>
                    <p className="text-sm text-[#1F1D1A] leading-relaxed">
                      &ldquo;{item.prompt}&rdquo;
                    </p>
                    <p className="mt-3 text-xs leading-5 text-[#7C746B]">
                      {item.description}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid md:grid-cols-[minmax(0,2fr)_1fr] gap-4">
                <div className="rounded-2xl bg-[#1F1D1A] p-6 text-white">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/60 mb-2">
                    Retrieval Query
                  </p>
                  <h2 className="text-3xl font-serif mb-3">{query}</h2>
                  <p className="text-sm text-white/70 leading-7">
                    The assistant is showing source-backed matches only. Use the source cards below to inspect the exact legal material returned by the backend.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#D8D2C8] bg-[#F5F5F4] p-6">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#7C746B] mb-2">
                    Retrieval View
                  </p>
                  <p className="text-2xl font-serif text-[#1F1D1A]">{results.length} hits</p>
                  <p className="text-sm text-[#63534B] mt-2">
                    Domains surfaced: {domainsFound.length > 0 ? domainsFound.map((item) => getDomainLabel(item)).join(", ") : "None"}
                  </p>
                  <p className="text-sm text-[#63534B] mt-1">
                    Search scope: {domain ? getDomainLabel(domain) : "All domains"}
                  </p>
                  {shouldShowBroaderResults ? (
                    <p className="mt-3 text-sm leading-6 text-[#1F1D1A]">
                      No exact matches were stored for {getDomainLabel(domain)}. Showing the strongest matches across all available domains instead.
                    </p>
                  ) : null}
                </div>
              </div>

              {searchError ? (
                <div className="rounded-2xl border border-[#DD3300]/20 bg-white p-6">
                  <p className="font-medium text-[#1F1D1A] mb-1">Retrieval unavailable</p>
                  <p className="text-sm text-[#63534B] leading-6">{searchError}</p>
                </div>
              ) : null}

              {!searchError && results.length === 0 ? (
                <div className="rounded-2xl border border-[#D8D2C8] bg-[#F5F5F4] p-8 text-center">
                  <h2 className="text-2xl font-serif text-[#1F1D1A] mb-3">
                    No grounded sources found
                  </h2>
                  <p className="text-[#63534B] max-w-2xl mx-auto leading-7">
                    {hasActiveDomainFilter
                      ? `No stored sources matched this question inside ${getDomainLabel(domain)}. Try the same question across all domains or switch to a broader Dutch legal term.`
                      : "No stored sources matched this question yet. Try a broader Dutch legal term or one of the live example searches below."}
                  </p>
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    {hasActiveDomainFilter ? (
                      <Link
                        href={buildAssistantHref(query)}
                        className="inline-flex items-center rounded-full border border-[#DD3300]/20 bg-white px-4 py-2 text-sm font-medium text-[#DD3300] hover:border-[#DD3300]/40"
                      >
                        Search all domains
                      </Link>
                    ) : null}
                    {SUGGESTED_PROMPTS.map((item) => (
                      <Link
                        key={`retry-${item.prompt}`}
                        href={buildAssistantHref(item.prompt)}
                        className="inline-flex items-center rounded-full border border-[#D8D2C8] bg-white px-4 py-2 text-sm text-[#63534B] hover:border-[#DD3300]/30 hover:text-[#1F1D1A]"
                      >
                        {item.prompt}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              {results.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-serif text-[#1F1D1A]">Top Sources</h3>
                    <Badge
                      variant="outline"
                      className="text-[#63534B] border-[#D8D2C8] bg-[#F5F5F4]"
                    >
                      Retrieval only
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    {results.map((result) => (
                      <SourceCard
                        key={result.id}
                        item={result}
                        href={`/dashboard/documents/${encodeURIComponent(
                          result.source_id || result.id,
                        )}${result.domain ? `?domain=${encodeURIComponent(result.domain)}` : ""}`}
                        footerLabel="Inspect source"
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>

        <div className="p-4 border-t border-[#D8D2C8] bg-[#F5F5F4] shrink-0">
          <form
            method="get"
            className="max-w-4xl mx-auto relative flex items-end bg-white rounded-xl border border-[#D8D2C8] shadow-sm focus-within:border-[#DD3300] focus-within:ring-1 focus-within:ring-[#DD3300]/20 transition-all p-2"
          >
            <textarea
              name="q"
              className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none resize-none px-3 py-3 text-sm text-[#1F1D1A] placeholder:text-[#BDA989] focus:outline-none"
              placeholder="Ask a Dutch legal question, for example: huurcontract opzegtermijn"
              defaultValue={query}
              rows={1}
            />

            <select
              name="domain"
              defaultValue={domain || ""}
              className="h-[44px] rounded-lg border border-[#D8D2C8] bg-[#F5F5F4] px-3 text-xs text-[#1F1D1A] focus:outline-none mr-2 hidden sm:block"
            >
              <option value="">All domains</option>
              {DOMAIN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <input type="hidden" name="limit" value={String(limit)} />

            <Button
              type="submit"
              size="icon"
              className="shrink-0 bg-[#DD3300] text-white hover:bg-[#DD3300]/90 rounded-lg ml-2 h-[44px] w-[44px]"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>

          <div className="text-center mt-3 flex items-center justify-center space-x-2">
            <Badge
              variant="outline"
              className="text-[10px] uppercase font-semibold text-[#BDA989] border-[#D8D2C8]"
            >
              Context: Stored sources
            </Badge>
            <span className="text-xs text-[#7C746B]">
              Results are grounded in the live backend search index.
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
